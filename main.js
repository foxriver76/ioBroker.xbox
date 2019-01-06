/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const IO_HOST_IP = require(__dirname + '/lib/network').getIP();
const {exec} = require('child_process');
const helper = require(__dirname + '/lib/utils');
const request = require('request');
const ping = require('ping');
const os = require('os').platform();

const restServerAddress = 'localhost'; // host of the REST server
let liveId;
let ip;
let mail;
let password;
let authenticate;
let blockXbox = false;
let tryPowerOn = false;
let xboxPingable = false;
let firstReconnectAttempt = true;
let xboxAvailable = false;
let restServerPid;
let adapter;

// is called when adapter shuts down - callback has to be called under any circumstances!
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'xbox'
    });

    adapter = new utils.Adapter(options);

    adapter.on('unload', callback => {
        try {
            let killCmd;

            adapter.setState('info.connection', false, true);
            adapter.setState('power.settings', false, true);
            if (os.startsWith('win')) {
                // Windows
                killCmd = 'taskkill /F /PID ' + restServerPid;
            } else {
                // Linux and Mac
                killCmd = 'pkill -f xbox-rest-server';
            } // endElse

            logOut(() => {
                exec(killCmd, (error, stdout, stderr) => {
                    if (!error) {
                        adapter.log.info('[END] REST server stopped');
                    } else {
                        adapter.log.info('[END] REST server stopped ' + stderr);
                    } // endElse

                    const promises = [];
                    promises.push(adapter.setStateAsync('info.connection', false, true));
                    promises.push(adapter.setStateAsync('info.activeTitleImage', '', true));
                    promises.push(adapter.setStateAsync('info.activeTitleName', '', true));
                    promises.push(adapter.setStateAsync('info.activeTitleId', '', true));
                    promises.push(adapter.setStateAsync('info.currentTitles', '{}', true));
                    promises.push(adapter.setStateAsync('info.activeTitleType', '', true));

                    Promise.all(promises).then(() => {
                        adapter.log.info('[END] cleaned everything up...');
                        callback();
                    });
                });
            });
        } catch (e) {
            callback();
        } // endTryCatch
    });

    adapter.on('stateChange', (id, state) => {
        if (!id || !state || state.ack) return; // Ignore acknowledged state changes or error states

        adapter.log.debug('[COMMAND] State Change - ID: ' + id + '; State: ' + state.val);

        const stateVal = state.val;
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
        liveId = adapter.config.liveId;
        authenticate = adapter.config.authenticate || false;
        mail = adapter.config.mail || '';
        password = adapter.config.password || '';

        if (!ip || !liveId) {
            adapter.log.warn('Please provide the ip address and the Live ID of your console');
            return;
        } else {
            adapter.log.debug('[START] IP address is ' + ip);
            adapter.log.info('[START] Starting REST server');
        } // endElse

        helper.startRestServer().catch((err) => {
            adapter.log.error('[START] Failed starting REST server: ' + err);
            adapter.log.error('[START] Restarting adapter in 30 seconds');
            setTimeout(() => restartAdapter(), 30000); // restart the adapter if REST server can't be started
        });

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

        prepareAuthentication(authenticate).then(() => setTimeout(() => main(), 6500)); // Server needs time to start
    });

    return adapter;
}


function main() {

    adapter.subscribeStates('*');

    // Authenticate on Xbox Live, make sure to be logged out first
    if (authenticate) {
        logOut(() => authenticateOnServer());
    } // endIf

    // Get Rest Server PID once for killing on windows
    if (os.startsWith('win')) {
        exec('wmic process get processid, commandline | findstr "^py *xbox-rest-server.exe>"', (err, stdout, stderr) => {
            restServerPid = stdout.split('.exe')[1].replace(/\s+/g, '');
            adapter.log.debug('[START] REST-Server is running as ' + restServerPid);
        });
    } // endIf

    setInterval(() => { // check online
        ping.sys.probe(ip, (isAlive) => {
            checkLoggedIn().catch((err) => {
                if (err) authenticateOnServer(); // err is only true when, lost auth recently, so try one reauthentication
                else adapter.log.debug('[CHECK] Auth is not established');
            });
            if (isAlive || xboxAvailable) {

                adapter.getState('settings.power', (err, state) => {
                    if (((!state || !state.val) || (state.val && !state.ack)) && xboxAvailable)
                        adapter.setState('settings.power', true, true);
                });

                xboxPingable = true;
                if (isAlive) adapter.log.debug('[PING] Xbox online');
                else adapter.log.debug('[PING] Xbox offline, but marked available');
                connect(ip, connectionState => { // check if connection is (still) established
                    if (connectionState === 'Connected') {
                        request('http://' + restServerAddress + ':5557/device/' + liveId + '/console_status', (error, response, body) => {
                            if (error)
                                return adapter.log.warn('[STATUS] <=== Error getting status: ' + error.message);

                            const currentTitles = JSON.parse(body).console_status.active_titles;
                            const currentTitlesState = {};
                            let activeName = '';
                            let activeHex = '';
                            let activeImage = '';
                            let activeType = '';
                            for (const i in currentTitles) {
                                const titleName = currentTitles[i].name.split('_')[0];
                                const titleHex = parseInt(currentTitles[i].title_id).toString(16);
                                currentTitlesState[titleName] = titleHex;
                                if (currentTitles[i].has_focus) {
                                    activeName = titleName;
                                    activeHex = titleHex;
                                    activeImage = currentTitles[i].image || '';
                                    activeType = currentTitles[i].type || '';
                                } // endIf
                            } // endFor
                            adapter.log.debug('[STATUS] Set ' + JSON.stringify(currentTitlesState));
                            adapter.getState('info.currentTitles', (err, state) => {
                                if (!state || state.val !== JSON.stringify(currentTitlesState))
                                    adapter.setState('info.currentTitles', JSON.stringify(currentTitlesState), true);
                            });
                            adapter.getState('info.activeTitleName', (err, state) => {
                                if (!state || state.val !== activeName)
                                    adapter.setState('info.activeTitleName', activeName, true);
                            });
                            adapter.getState('info.activeTitleId', (err, state) => {
                                if (!state || state.val !== activeHex)
                                    adapter.setState('info.activeTitleId', activeHex, true);
                            });
                            adapter.getState('info.activeTitleImage', (err, state) => {
                                if (!state || state.val !== activeImage)
                                    adapter.setState('info.activeTitleImage', activeImage, true);
                            });
                            adapter.getState('info.activeTitleType', (err, state) => {
                                if (!state || state.val !== activeType)
                                    adapter.setState('info.activeTitleType', activeType, true);
                            });
                        });
                    } // endIf
                });
            } else {
                adapter.getState('info.connection', (err, state) => {
                    if ((!state || state.val) && !xboxAvailable) {
                        adapter.setState('info.connection', false, true);
                        adapter.setState('info.activeTitleImage', '', true);
                        adapter.setState('info.activeTitleName', '', true);
                        adapter.setState('info.activeTitleId', '', true);
                        adapter.setState('info.currentTitles', '{}', true);
                        adapter.setState('info.activeTitleType', '', true);

                        adapter.log.info('[PING] Lost connection to your Xbox (' + ip + ')');
                        firstReconnectAttempt = true;
                    } // endIf
                });
                adapter.getState('settings.power', (err, state) => {
                    if (!state || (state.val && !xboxAvailable))
                        adapter.setState('settings.power', false, true);
                });
                xboxPingable = false;
                adapter.log.debug('[PING] Xbox offline');
            } // endElse
        });
    }, 6000);

} // endMain

function connect(ip, cb) {
    discoverAndUpdateConsole(ip, (connectionState, discovered, device) => {
        const statusURL = 'http://' + restServerAddress + ':5557/device/' + liveId + '/connect';

        adapter.log.debug('[CONNECT] Check connection');

        if (connectionState === 'Error') {
            adapter.log.warn('[CONNECT] Error with rest server, restarting adapter');
            return restartAdapter();
        } // endIf

        // Set device status to var to not only rely on ping to check if Xbox is online
        if (device && device.device_status === 'Available') xboxAvailable = true;
        else xboxAvailable = false;

        if (connectionState && connectionState !== 'Disconnected') {
            adapter.getState('info.connection', (err, state) => {
                if (state.val && connectionState === 'Connected') {
                    adapter.log.debug('[CONNECT] Still connected');
                } else if (connectionState === 'Connecting') {
                    adapter.log.debug('[CONNECT] Currently connecting');
                } else {
                    adapter.setState('info.connection', true, true);
                    adapter.log.info('[CONNECT] <=== Successfully connected to ' + liveId + ' (' + device.address + ')');
                } // endIf

                if (cb && typeof (cb) === 'function') return cb(connectionState);
            });
        } else {
            adapter.getState('info.connection', (err, state) => {
                if (!state || state.val) {
                    adapter.setState('info.connection', false, true);
                    adapter.setState('info.activeTitleImage', '', true);
                    adapter.setState('info.activeTitleName', '', true);
                    adapter.setState('info.activeTitleId', '', true);
                    adapter.setState('info.currentTitles', '{}', true);
                    adapter.setState('info.activeTitleType', '', true);
                    adapter.log.info('[CONNECT] <=== Lost connection to your Xbox (' + ip + ')');
                    firstReconnectAttempt = true;
                } // endIf
            });

            if (liveId && device && device.device_status === 'Available') {
                request(statusURL, (error, response, body) => {
                    if (!error) {
                        if (JSON.parse(body).success) {
                            adapter.setState('info.connection', true, true);
                            adapter.log.info('[CONNECT] <=== Successfully connected to ' + liveId + ' (' + device.address + ')');
                            connectionState = true;
                        } else {
                            if (firstReconnectAttempt)
                                adapter.log.warn('[CONNECT] <=== Connection to your Xbox failed: ' + JSON.parse(body).message);
                            else
                                adapter.log.debug('[CONNECT] <=== Connection to your Xbox failed: ' + JSON.parse(body).message);
                            adapter.setState('info.connection', false, true);
                            connectionState = false;
                        } //endElse
                    } else {
                        adapter.log.error('[CONNECT] <=== ' + error.message);
                        adapter.setState('info.connection', false, true);
                        connectionState = false;
                        if (error.message.includes('ECONNREFUSED')) {
                            adapter.log.error('[CONNECT] REST server seems to be down, adapter will be restarted');
                            restartAdapter();
                        } // endIf
                    } // endElse
                    if (cb && typeof (cb) === 'function') return cb(connectionState);
                });
            } else if (device && device.device_status === 'Unavailable') {
                adapter.log.debug('[CONNECT] Console currently unavailable');
            } else if (firstReconnectAttempt) {
                adapter.log.warn('[CONNECT] Ping response, but provided LiveID has not been discovered until now');
                firstReconnectAttempt = false;
            } else
                adapter.log.debug('[CONNECT] Ping response, but provided LiveID has not been discovered until now');
        } // endElse
    });
} // endConnect

function powerOff(liveId, cb) {

    const endpoint = 'http://' + restServerAddress + ':5557/device/' + liveId + '/poweroff';
    adapter.log.debug('[POWEROFF] Powering off Xbox' + ip + ')');

    request(endpoint, (error, response, body) => {
        if (!error) {
            if (JSON.parse(body).success) {
                adapter.log.debug('[POWEROFF] <=== ' + body);
            } else {
                adapter.log.warn('[POWEROFF] <=== ' + body);
            } //endElse
        } else {
            adapter.log.error('[POWEROFF] <=== ' + error.message);
        } // endElse
        if (cb && typeof (cb) === 'function') return cb();
    });

} // endPowerOff

function discoverAndUpdateConsole(ip, cb) { // is used by connect
    adapter.getState('info.connection', (err, state) => {
        let endpoint;
        if (!state || !state.val) {
            endpoint = 'http://' + restServerAddress + ':5557/device?addr=' + ip;
            adapter.log.debug('[DISCOVER] Searching for consoles');
        } else {
            endpoint = 'http://' + restServerAddress + ':5557/device/' + liveId;
            adapter.log.debug('[UPDATE] Check console status');
        } // endElse
        let connectionState = false;
        let discovered = false;

        request(endpoint, (error, response, body) => {
            let device;
            if (!error) {
                const jsonBody = JSON.parse(body);
                if (state && state.val) {
                    try {
                        device = jsonBody.device;
                        liveId = jsonBody.device.liveid;
                        connectionState = jsonBody.device.connection_state;
                        adapter.log.debug('[UPDATE] <=== ' + body);
                    } catch (e) {
                        adapter.log.debug('[UPDATE] <=== ' + body);
                    }
                } else try {
                    for (const i in jsonBody.devices) {
                        if (jsonBody.devices[i].address === ip) {
                            liveId = jsonBody.devices[i].liveid;
                            discovered = true;
                        } // endIf
                    } // endFor
                    if (jsonBody.devices[liveId].connection_state)
                        connectionState = jsonBody.devices[liveId].connection_state;
                    device = jsonBody.devices[liveId];
                    adapter.log.debug('[DISCOVER] <=== ' + JSON.stringify(jsonBody.devices));
                } catch (e) {
                    adapter.log.debug('[DISCOVER] <=== ' + body);
                }
            } else {
                adapter.log.error('[DISCOVER] <=== ' + error.message);
                adapter.setState('info.connection', false, true);
            }
            if (cb && typeof (cb) === 'function') return cb(connectionState, discovered, device);
        });
    });

} // endDiscover

function powerOn(cb) {
    const endpoint = 'http://' + restServerAddress + ':5557/device/' + liveId + '/poweron?addr=' + ip;
    if (!tryPowerOn) { // if Xbox isn't on after 17.5 seconds, stop trying
        tryPowerOn = setTimeout(() => tryPowerOn = false, 17500);
    } // endIf
    adapter.log.debug('[POWERON] Powering on console');
    blockXbox = true;

    request(endpoint, (error, response, body) => {
        if (error) adapter.log.error('[REQUEST] <=== ' + error.message);

        if (!xboxPingable) {
            if (tryPowerOn)
                powerOn();
            else {
                adapter.log.warn('[REQUEST] <=== Could not turn on Xbox');
                blockXbox = false;
            } // endElse
        } else blockXbox = false; // unblock Box because on

        if (cb && typeof (cb) === 'function') return cb();
    });

} // endPowerOn

function handleStateChange(state, id, cb) {
    if (blockXbox) return adapter.log.warn('[STATE] ' + id + ' change to ' + state.val + ' dropped, because Xbox blocked');
    blockXbox = setTimeout(() => blockXbox = false, 100); // box is blocked for 100 ms to avoid overload

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
            sendCustomCommand('http://' + restServerAddress + ':5557/device/' + liveId + '/media/seek/' + state,
                () => adapter.setState(id, state, true));
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
        case 'settings.inputText':
            sendCustomCommand('http://' + restServerAddress + ':5557/device/' + liveId + '/text/' + state,
                () => adapter.setState(id, state, true));
            break;
        case 'settings.launchTitle':
            sendCustomCommand('http://' + restServerAddress + ':5557/device/' + liveId + '/launch/ms-xbl-' + state + '://',
                () => adapter.setState(id, state, true));
            break;
        case 'settings.gameDvr':
            sendCustomCommand('http://' + restServerAddress + ':5557/device/' + liveId + '/gamedvr');
            break;
        default:
            adapter.log.warn('[COMMAND] ===> Not a valid id: ' + id);
    } // endSwitch
    if (cb && typeof (cb) === 'function') return cb();
} // endHandleStateChange

function sendButton(button, cb) {
    const endpoint = 'http://' + restServerAddress + ':5557/device/' + liveId + '/input/' + button;
    let success = false;

    request(endpoint, (error, response, body) => {
        if (error) adapter.log.error('[REQUEST] <=== ' + error.message);
        else if (JSON.parse(body).success) {
            adapter.log.debug('[REQUEST] <=== Button ' + button + ' acknowledged by REST-Server');
            success = true;
        } else
            adapter.log.warn('[REQUEST] <=== Button ' + button + ' not acknowledged by REST-Server');

        if (cb && typeof (cb) === 'function') return cb(success);
    });
} // endSendButton

function sendMediaCmd(cmd, cb) {
    const endpoint = 'http://' + restServerAddress + ':5557/device/' + liveId + '/media/' + cmd;

    request(endpoint, (error, response, body) => {
        if (error) adapter.log.error('[REQUEST] <=== ' + error.message);
        else if (JSON.parse(body).success)
            adapter.log.debug('[REQUEST] <=== Media command ' + cmd + ' acknowledged by REST-Server');
        else
            adapter.log.warn('[REQUEST] <=== Media command ' + cmd + ' not acknowledged by REST-Server');
        if (cb && typeof (cb) === 'function') return cb();
    });
} // endSendMediaCmd

function sendCustomCommand(endpoint, cb) {
    // Returns cb on success
    request(endpoint, (error, response, body) => {
        if (error) adapter.log.error('[REQUEST] <=== Custom request error: ' + error.message);
        else if (response.statusCode === 200 && JSON.parse(body).success) {
            adapter.log.debug('[REQUEST] <=== Custom Command ' + endpoint + ' acknowledged by REST-Server');
            if (cb && typeof (cb) === 'function') return cb();
        } else
            adapter.log.warn('[REQUEST] <=== Custom command ' + endpoint + ' not acknowledged by REST-Server');
    });
} // endSendCustomCommand

function restartAdapter() {
    adapter.getForeignObject('system.adapter.' + adapter.namespace, (err, obj) => {
        if (obj) adapter.setForeignObject('system.adapter.' + adapter.namespace, obj);
    });
} // endFunctionRestartAdapter


function decrypt(key, value) {
    let result = '';
    for (let i = 0; i < value.length; ++i) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
} // endDecrypt

function authenticateOnServer(cb) {
    request.post('http://' + restServerAddress + ':5557/auth/login',
        {form: {email: mail, password: password}}, (err, response, body) => {
            if (!err && JSON.parse(body).two_factor_required) {
                adapter.log.debug('[LOGIN] Two factor authentication required, try to load token');
                loadToken().then(() => {
                    if (cb && typeof (cb) === 'function') return cb();
                }).catch(() => {
                    adapter.log.warn('[LOGIN] Failed to load Token, log in at http://' + IO_HOST_IP + ':5557/auth/oauth');
                });
            } else if (err && err.toString().includes('ECONNREFUSED')) {
                adapter.log.warn('[LOGIN] Connection refused, will try again');
                setTimeout(() => authenticateOnServer(cb), 1000);
            } else if (err || JSON.parse(body).success === false) {
                adapter.log.warn('[LOGIN] <=== Error: ' + err);
                adapter.getState('info.authenticated', (err, state) => {
                    if (!state || state.val) {
                        adapter.setState('info.authenticated', false, true);
                    } // endIf
                });
                adapter.getState('info.gamertag', (err, state) => {
                    if (state && state.val !== '') {
                        adapter.setState('info.gamertag', '', true);
                    } // endIf
                });
            } else {
                adapter.log.debug('[LOGIN] <=== Successfully logged in: ' + body);
                adapter.getState('info.authenticated', (err, state) => {
                    if (!state || !state.val) {
                        adapter.setState('info.authenticated', true, true);
                    } // endIf
                });
                adapter.getState('info.gamertag', (err, state) => {
                    if (state && state.val !== JSON.parse(body).gamertag) {
                        adapter.setState('info.gamertag', JSON.parse(body).gamertag, true);
                    } // endIf
                });
            } // endElse

            if (cb && typeof (cb === 'function')) return cb();
        });
} // endAuthenticateOnServer

function logOut(cb) {
    request.post('http://' + restServerAddress + ':5557/auth/logout', (err, response, body) => {

        if (!err && JSON.parse(body).success) {
            adapter.log.debug('[LOGOUT] <=== Successfully logged out');
            adapter.setState('info.authenticated', false, true);
            adapter.setState('info.gamertag', '', true, () => {
                if (cb && typeof (cb === 'function')) return cb();
            });
        } else {
            adapter.log.debug('[LOGOUT] <=== Failed to logout: ' + body);
            if (cb && typeof (cb === 'function')) return cb();
        } // endElse
    });
} // endLogOut

function checkLoggedIn() {
    return new Promise((resolve, reject) => {
        request('http://' + restServerAddress + ':5557/auth', (err, response, body) => {
            if (response.statusCode === 200 && JSON.parse(body).authenticated) {
                adapter.getState('info.authenticated', (err, state) => {
                    if (!state || !state.val) {
                        adapter.setState('info.authenticated', true, true);
                        adapter.log.debug('[CHECK] Successfully logged in');
                    } // endIf
                });
                adapter.getState('info.gamertag', (err, state) => {
                    if (state && state.val !== JSON.parse(body).userinfo.gtg) {
                        adapter.setState('info.gamertag', JSON.parse(body).userinfo.gtg, true);
                    } // endIf
                });
                resolve();
            } else {
                adapter.getState('info.gamertag', (err, state) => {
                    if (state && state.val !== '') {
                        adapter.setState('info.gamertag', '', true);
                    } // endIf
                });

                adapter.getState('info.authenticated', (err, state) => {
                    if (!state || state.val) {
                        adapter.setState('info.authenticated', false, true);
                        adapter.log.debug('[CHECK] Auth is broken or logged out');
                        reject('BROKEN');
                    } else reject();
                });
            } // endElse
        });
    });
} // endCheckLoggedIn

function loadToken() {
    return new Promise((resolve, reject) => {
        request('http://' + restServerAddress + ':5557/auth/load', (err, response, body) => {
            if (!err && response.statusCode === 200) {
                adapter.log.debug('[TOKEN] <=== Successfully loaded token');
                adapter.setState('info.authenticated', true, true);
                request('http://' + restServerAddress + ':5557/auth', (err, response, body) => {
                    if (!err && JSON.parse(body).authenticated) {
                        adapter.log.debug('[TOKEN] <=== Successfully retrieved gamertag');
                        adapter.setState('info.gamertag', JSON.parse(body).userinfo.gtg, true);
                        resolve();
                    } else {
                        adapter.log.warn('[TOKEN] <=== Error retrieving gamertag: ' + body);
                        reject();
                    } // endElse
                });
            } else {
                adapter.log.warn('[TOKEN] Error loading token: ' + body);
                reject();
            } // endElse
        });
    });
} // endLoadToken

function prepareAuthentication(authenticate) {
    return new Promise(resolve => {
        if (authenticate) {
            const promises = [];
            // create Auth-Only Objects
            promises.push(adapter.setObjectNotExistsAsync('info.authenticated', {
                type: 'state',
                common: {
                    name: 'Xbox Live authenticated',
                    role: 'indicator.authenticated',
                    type: 'boolean',
                    read: true,
                    write: false,
                    def: false
                },
                native: {}
            }));

            promises.push(adapter.setObjectNotExistsAsync('info.activeTitleImage', {
                type: 'state',
                common: {
                    name: 'Active title image',
                    role: 'icon',
                    type: 'string',
                    read: true,
                    write: false
                },
                native: {}
            }));

            promises.push(adapter.setObjectNotExistsAsync('info.gamertag', {
                type: 'state',
                common: {
                    name: 'Authenticated Gamertag',
                    role: 'name.user',
                    type: 'string',
                    read: true,
                    write: false
                },
                native: {}
            }));

            promises.push(adapter.setObjectNotExistsAsync('settings.gameDvr', {
                type: 'state',
                common: {
                    name: 'Game Recorder',
                    role: 'button',
                    type: 'boolean',
                    read: true,
                    write: true
                },
                native: {}
            }));

            promises.push(new Promise(resolve => {
                adapter.getForeignObjectAsync('system.config').then(obj => {
                    if (obj && obj.native && obj.native.secret) {
                        password = decrypt(obj.native.secret, password);
                        mail = decrypt(obj.native.secret, mail);
                        resolve();
                    } else {
                        password = decrypt('Zgfr56gFe87jJOM', password);
                        mail = decrypt('Zgfr56gFe87jJOM', mail);
                        resolve();
                    } // endElse
                });
            }));

            Promise.all(promises).then(() => resolve());
        } else {
            // del Objects
            adapter.delObject('info.authenticated');
            adapter.delObject('info.gamertag');
            adapter.delObject('info.activeTitleImage');
            adapter.delObject('info.gameDvr');
            resolve();
        } // endElse
    });
} // endPrepareAuthentication

// If started as allInOne/compact mode => return function to create instance
if (typeof module !== 'undefined' && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}