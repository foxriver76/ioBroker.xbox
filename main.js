/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
const adapter = new utils.Adapter('xbox');
const {exec} = require('child_process');
const request = require('request');
const ping = require('ping');
const os = require('os').platform();

const address = 'localhost'; // host of the REST server
let liveId;
let ip;
let blockXbox = false;
let tryPowerOn = false;
let xboxOnline = false;
let firstReonnectAttempt = true;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', callback => {
    try {
        let killCmd;

        if (os.startsWith('win')) {
            // Windows
            killCmd = 'Taskkill /IM xbox-rest-server /F';
        } else
        // Linux and Mac
            killCmd = 'pkill -f xbox-rest-server';

        exec(killCmd, (error, stdout, stderr) => {
            if (!error) {
                adapter.log.info('[END] REST server stopped');
            } else {
                adapter.log.info('[END] REST server stopped ' + stderr);
            } // endElse

            adapter.setState('info.connection', false, true);
            adapter.log.info('[END] cleaned everything up...');
            callback();
        });

    } catch (e) {
        callback();
    } // endTryCatch
});

adapter.on('stateChange', (id, state) => {
    if (!id || !state || state.ack) return; // Ignore acknowledged state changes or error states

    adapter.log.debug('[COMMAND] State Change - ID: ' + id + '; State: ' + state.val);

    let stateVal = state.val;
    id = id.substring(adapter.namespace.length + 1); // remove instance name and id

    if (stateVal && id === 'settings.power') {
        handleStateChange(state, id);
    } else {
        adapter.getState('info.connection', (err, state) => {
            if (state.val)
                handleStateChange(stateVal, id);
            else
                adapter.log.warn('[COMMAND] ===> Can not handle id change ' + id + ' with value ' + stateVal + ' because not connected');
        });
    } // endElse
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', obj => {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'browse') {
            // e.g. send email or pushover or whatever
            adapter.log.info('[BROWSE] Start browsing');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        } // endIf
    } // endIf
});

adapter.on('ready', () => {

    ip = adapter.config.ip;

    if (!ip) {
        adapter.log.warn('Please provide the ip address of your console');
        return;
    } else {
        adapter.log.debug('[START] IP address is ' + ip);
        adapter.log.info('[START] Starting REST server');
    } // endElse

    startRestServer((started, err) => {
        if (!started) {
            adapter.log.error('[START] Failed starting REST server: ' + err);
            adapter.log.error('[START] Restarting adapter in 30 seconds');
            let restartTimer = setTimeout(() => restartAdapter(), 30000); // restart the adapter if REST server can't be started
        } // endIf
    });

    setTimeout(() => main(), 4000); // Server needs time to start
});

function main() {

    adapter.subscribeStates('*');

    let checkOnline = setInterval(() => {
        ping.sys.probe(ip, (isAlive) => {
            if (isAlive) {
                adapter.setState('settings.power', true, true);
                if (!xboxOnline)
                    firstReonnectAttempt = true;
                else
                    firstReonnectAttempt = false;
                xboxOnline = true;
                adapter.log.debug('[PING] Xbox online');
                connect(ip); // check if connection is (still) established
            } else {
                adapter.getState('info.connection', (err, state) => {
                    if (state.val) {
                        adapter.setState('info.connection', false, true);
                        adapter.log.info('[PING] Lost connection to your Xbox');
                    } // endIf
                });
                adapter.setState('settings.power', false, true);
                xboxOnline = false;
                adapter.log.debug('[PING] Xbox offline');
            } // endElse
        });
    }, 6000);

} // endMain

function connect(ip, cb) {
    discover(ip, (conn, discovered, device) => {
        let statusURL = 'http://' + address + ':5557/device/' + liveId + '/connect';
        let connected = conn;

        adapter.log.debug('[CONNECT] Check connection');
        if (conn) {
            adapter.getState('info.connection', (err, state) => {
                if (state.val && conn) {
                    adapter.log.debug('[CONNECT] Still connected');
                } else {
                    adapter.setState('info.connection', true, true);
                    adapter.log.info('[CONNECT] <=== Successfully connected to ' + liveId + ' (' + JSON.stringify(device.address) + ')');
                } // endIf

                if (cb && typeof(cb) === "function") return cb(connected);
            });
        } else if (liveId) {
            request(statusURL, (error, response, body) => {
                if (!error) {
                    if (JSON.parse(body).success) {
                        adapter.setState('info.connection', true, true);
                        adapter.log.info('[CONNECT] <=== Successfully connected to ' + liveId + ' (' + JSON.stringify(device.address) + ')');
                        connected = true;
                    } else {
                        if (firstReonnectAttempt)
                            adapter.log.warn('[CONNECT] <=== Connection to your Xbox failed: ' + JSON.parse(body).message);
                        else
                            adapter.log.debug('[CONNECT] <=== Connection to your Xbox failed: ' + JSON.parse(body).message);
                        adapter.setState('info.connection', false, true);
                        connected = false;
                    } //endElse
                } else {
                    adapter.log.error('[CONNECT] <=== ' + error.message);
                    adapter.setState('info.connection', false, true);
                    connected = false;
                    if (error.message.includes('ECONNREFUSED')) {
                        adapter.log.error('[CONNECT] REST server seems to be down, adapter will be restarted');
                        restartAdapter();
                    } // endIf
                } // endElse
                if (cb && typeof(cb) === "function") return cb(connected);
            });
        } else if (firstReonnectAttempt)
            adapter.log.warn('[CONNECT] No LiveID discovered until now');
        else
            adapter.log.debug('[CONNECT] No LiveID discovered until now');
    });
} // endConnect

function powerOff(liveId, cb) {

    let endpoint = 'http://' + address + ':5557/device/' + liveId + '/poweroff';
    adapter.log.debug('[POWEROFF] Powering off Xbox');

    request(endpoint, (error, response, body) => {
        if (!error) {
            if (JSON.parse(body).success) {
                adapter.setState('info.connection', false, true);
                adapter.log.info('[POWEROFF] Connection to Xbox closed')
                adapter.log.debug('[POWEROFF] <=== ' + body);
            } else {
                adapter.log.warn('[POWEROFF] <=== ' + body);
            } //endElse
        } else {
            adapter.log.error('[POWEROFF] <=== ' + error.message);
        } // endElse
        if (cb && typeof(cb) === "function") return cb();
    });

} // endPowerOff

function discover(ip, cb) { // is used by connect
    let endpoint = 'http://' + address + ':5557/device';
    let connected = false;
    let discovered = false;
    adapter.log.debug('[DISCOVER] Searching for consoles');

    request(endpoint, (error, response, body) => {
        let device;
        if (!error) {
            let jsonBody = JSON.parse(body);
            try {
                for (let i in jsonBody.devices) {
                    if (jsonBody.devices[i].address === ip) {
                        liveId = jsonBody.devices[i].liveid;
                        discovered = true;
                    } // endIf
                } // endFor
                if (jsonBody.devices[liveId].connection_state === 'Connected')
                    connected = true;
                device = jsonBody.devices[liveId];
                adapter.log.debug('[DISCOVER] <=== ' + JSON.stringify(jsonBody.devices));
            } catch (e) {
                adapter.log.debug('[DISCOVER] <=== ' + body);
            }
        } else {
            adapter.log.error('[DISCOVER] <=== ' + error.message);
            adapter.setState('info.connection', false, true);
        }
        if (cb && typeof(cb) === "function") return cb(connected, discovered, device);
    });

} // endDiscover

function powerOn(cb) {
    let endpoint = 'http://' + address + ':5557/device/' + liveId + '/poweron';
    if (!tryPowerOn) { // if Xbox isn't on after 17.5 seconds, stop trying
        tryPowerOn = setTimeout(() => tryPowerOn = false, 17500);
    } // endIf
    adapter.log.debug('[POWERON] Powering on console');
    blockXbox = true;

    request(endpoint, (error, response, body) => {
        if (error) adapter.log.error('[REQUEST] <=== ' + error.message);

        if (!xboxOnline) {
            if (tryPowerOn)
                powerOn();
            else {
                adapter.log.warn('[REQUEST] <=== Could not turn on Xbox');
                blockXbox = false;
            } // endElse
        } else blockXbox = false; // unblock Box because on

        if (cb && typeof(cb) === "function") return cb();
    });

} // endPowerOn

function handleStateChange(state, id, cb) {
    if (blockXbox) return adapter.log.warn('[STATE] ' + id + ' change to ' + state.val + ' dropped, because Xbox blocked');
    blockXbox = true;
    let unblockXbox = setTimeout(() => blockXbox = false, 100); // box is blocked for 100 ms to avoid overload

    switch (id) {
        case 'settings.power':
            if (state) {
                powerOn();
            } else {
                powerOff(liveId);
            } // endElse
            break;
        case 'gamepad.rightShoulder':
            sendButton('right_shoulder');
            break;
        case 'gamepad.leftShoulder':
            sendButton('left_shoulder');
            break;
        case 'gamepad.leftThumbstick':
            sendButton('left_thumbstick');
            break;
        case 'gamepad.rightThumbstick':
            sendButton('left_thumbstick');
            break;
        case 'gamepad.enroll':
            sendButton('enroll');
            break;
        case 'gamepad.view':
            sendButton('view');
            break;
        case 'gamepad.menu':
            sendButton('menu');
            break;
        case 'gamepad.nexus':
            sendButton('nexus');
            break;
        case 'gamepad.a':
            sendButton('a');
            break;
        case 'gamepad.b':
            sendButton('b');
            break;
        case 'gamepad.y':
            sendButton('y');
            break;
        case 'gamepad.x':
            sendButton('x');
            break;
        case 'gamepad.dpadUp':
            sendButton('dpad_up');
            break;
        case 'gamepad.dpadDown':
            sendButton('dpad_down');
            break;
        case 'gamepad.dpadLeft':
            sendButton('dpad_left');
            break;
        case 'gamepad.dpadRight':
            sendButton('dpad_right');
            break;
        case 'gamepad.clear':
            sendButton('clear');
            break;
        case 'media.play':
            sendMediaCmd('play');
            break;
        case 'media.pause':
            sendMediaCmd('pause');
            break;
        case 'media.record':
            sendMediaCmd('record');
            break;
        case 'media.playPause':
            sendMediaCmd('play_pause');
            break;
        case 'media.previousTrack':
            sendMediaCmd('prev_track');
            break;
        case 'media.seek':
            sendMediaCmd('seek');
            break;
        case 'media.channelUp':
            sendMediaCmd('channel_up');
            break;
        case 'media.nextTrack':
            sendMediaCmd('next_track');
            break;
        case 'media.channelDown':
            sendMediaCmd('channel_down');
            break;
        case 'media.menu':
            sendMediaCmd('menu');
            break;
        case 'media.back':
            sendMediaCmd('back');
            break;
        case 'media.rewind':
            sendMediaCmd('rewind');
            break;
        case 'media.view':
            sendMediaCmd('view');
            break;
        case 'media.fastForward':
            sendMediaCmd('fast_forward');
            break;
        case 'media.stop':
            sendMediaCmd('stop');
            break;
        default:
            adapter.log.warn('[COMMAND] ===> Not a valid id: ' + id)
    } // endSwitch
    if (cb && typeof(cb) === "function") return cb();
} // endHandleStateChange

function sendButton(button, cb) {
    let endpoint = 'http://' + address + ':5557/device/' + liveId + '/input/' + button;
    let success = false;

    request(endpoint, (error, response, body) => {
        if (error) adapter.log.error('[REQUEST] <=== ' + error.message);
        else if (JSON.parse(body).success) {
            adapter.log.debug('[REQUEST] <=== Button ' + button + ' acknowledged by REST-Server');
            success = true;
        } else
            adapter.log.warn('[REQUEST] <=== Button ' + button + ' not acknowledged by REST-Server');

        if (cb && typeof(cb) === "function") return cb(success);
    });
} // endSendButton

function sendMediaCmd(cmd, cb) {
    let endpoint = 'http://' + address + ':5557/device/' + liveId + '/media/' + cmd;

    request(endpoint, (error, response, body) => {
        if (error) adapter.log.error('[REQUEST] <=== ' + error.message);
        else if (JSON.parse(body).success)
            adapter.log.debug('[REQUEST] <=== Media command ' + cmd + ' acknowledged by REST-Server');
        else
            adapter.log.warn('[REQUEST] <=== Media command ' + cmd + ' not acknowledged by REST-Server');
        if (cb && typeof(cb) === "function") return cb();
    });
} // endSendMediaCmd

adapter.getForeignObject(adapter.namespace, (err, obj) => { // create device namespace
    if (!obj) {
        adapter.setForeignObject(adapter.namespace, {
            type: 'device',
            common: {
                name: 'Xbox device'
            }
        });
    } // endIf
});

function startRestServer(cb) {

    let startCmd;
    let started;

    if (os.startsWith('win')) {
        // Windows
        startCmd = __dirname + '\\node_modules\\nopy\\src\\nopy.js ' + __dirname + '\\python_modules\\bin\\xbox-rest-server';
    } else
    // Linux and MAC -- if not found in node_modules try root project
        startCmd = __dirname + '/node_modules/nopy/src/nopy.js ' + __dirname + '/python_modules/bin/xbox-rest-server' +
            ' || ' + __dirname + '/../nopy/src/nopy.js ' + __dirname + '/python_modules/bin/xbox-rest-server';

    exec(startCmd, (error, stdout, stderr) => {
        let err = false;
        if (error && !stderr.includes('REST server started')) {
            started = false;
            err = stderr;
        } else {
            started = true;
        } // endElse
        // Callback is only executed when program is finished/goes on
        if (cb && typeof(cb) === "function") return cb(started, err);
    });

} // endStartRestServer

function restartAdapter() {
    adapter.getForeignObject('system.adapter.' + adapter.namespace, (err, obj) => {
        if (obj) adapter.setForeignObject('system.adapter.' + adapter.namespace, obj);
    });
} // endFunctionRestartAdapter
