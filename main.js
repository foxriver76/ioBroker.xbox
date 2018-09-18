/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
const adapter = new utils.Adapter('xbox');
const { exec } = require('child_process');
const request = require('request');
const ping = require('ping');

const address = 'localhost'; // not used
let liveId;
let ip;
let blockXbox = false;
let tryPowerOn = false;
let xboxOnline = false;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', callback => {
    try {
    	// TODO: check windows
    	exec('pkill -f xbox-rest-server', (error, stdout, stderr) => {
    		if(!error) {
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

    state = state.val;
    id = id.substring(adapter.namespace.length + 1); // remove instance name and id

    if(state && id === 'settings.power') {
        handleStateChange(state, id);
    } else {
    	adapter.getState('info.connection', (err, state) => {
    		if(state) 
    			handleStateChange(state, id);
    		else 
    		    adapter.log.warn('[COMMAND] ===> Can not handle id change ' + id + ' with value ' + state + ' because not connected');
        });
    } // endElse
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', obj => {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        } // endIf
    } // endIf
});

adapter.on('ready', () => {
	// TODO: check windows
	liveId = adapter.config.liveId;
	ip = adapter.config.ip;
	
	if(!liveId || !ip) {
		adapter.log.warn('Please provide a Xbox Live ID and a ip address');
		return;
	} else adapter.log.debug('[START] Live ID is ' + liveId + '\n[START] ip adress is ' + ip);

	startRestServer((started) => {
		if(!started) {
			adapter.log.error('[START] Failed starting REST server');
			// maybe we should restart the adapter in this case
		} // endIf
	});
	
	setTimeout(() => main(), 4000); // Server needs time to start
	
});

function main() {
	
    adapter.subscribeStates('*');

	let checkOnline = setInterval(() => {
		ping.sys.probe(ip, (isAlive) => {
	        if(isAlive) {
	        	adapter.setState('settings.power', true, true);
	        	xboxOnline = true;
	        	adapter.log.debug('[PING] Xbox online');
	        	connect(liveId); // check if connection is (still) established
	        } else {
	        	adapter.setState('info.connection', false, true);
	        	adapter.setState('settings.power', false, true);
	        	xboxOnline = false;
	        	adapter.log.debug('[PING] Xbox offline');
	        } // endElse
	    });		
	}, 6000);

} // endMain

function connect(liveId, cb) {
	discover(() => {
		let statusURL = 'http://' + address + ':5557/device/' + liveId + '/connect';
		let connected;
		adapter.log.debug('[CONNECT] Check connection');
		
		request(statusURL, (error, response, body) => {
			if(!error) {
				if(JSON.parse(body).success) {
					adapter.setState('info.connection', true, true);
					adapter.log.debug('[CONNECT] Connection successfully confirmed');
					connected = true;
				} else {
					adapter.log.warn('[CONNECT] <=== ' + body);
					adapter.setState('info.connection', false, true);
					connected = false;
				} //endElse
			} else {
				adapter.log.error('[CONNECT] <=== ' + error.message);
				adapter.setState('info.connection', false, true);
				connected = false;
			} // endElse
			if(cb && typeof(cb) === "function") return cb(connected);
		});
		
	});
} // endConnect

function powerOff(liveId, cb) {
	
	let endpoint = 'http://' + address + ':5557/device/' + liveId + '/poweroff';
	
	request(endpoint, (error, response, body) => {
		if(!error) {
			if(JSON.parse(body).success) {
				adapter.setState('settings.power', false, true);
				adapter.log.debug('[POWEROFF] <=== ' + body);
			} else {
				adapter.log.warn('[POWEROFF] <=== ' + body);
			} //endElse
		} else {
			adapter.log.error('[POWEROFF] <=== ' + error.message);
		} // endElse
		if(cb && typeof(cb) === "function") return cb();
	});
	
} // endPowerOff

function discover(cb) { // is used by connect
	let endpoint = 'http://' + address +':5557/device';
	
	request(endpoint, (error, response, body) => {
		if(!error) {
			adapter.log.debug('[DISCOVER] <=== ' + body);
		} else {
			adapter.log.error('[DISCOVER] <=== ' + error.message);
			adapter.setState('info.connection', false, true);
		}
		if(cb && typeof(cb) === "function") return cb();
	});
		
} // endDiscover

function powerOn(cb) {
		let endpoint = 'http://' + address + ':5557/device/' + liveId + '/poweron';
		if(!tryPowerOn) { // if Xbox isn't on after 15 seconds, stop trying
			tryPowerOn = true;
			tryPowerOn = setTimeout(() => tryPowerOn = false, 15000);
		} // endIf
		adapter.log.debug('Powering on console');
		blockXbox = true;
		
		request(endpoint, (error, response, body) => {
			if(error) adapter.log.error('[REQUEST] <=== ' + error.message);
		
			if(!xboxOnline) {
				if(tryPowerOn)
					powerOn();
				else 
					adapter.log.warn('[REQUEST] <=== Could not turn on Xbox');
			} else blockXbox = false; // unblock Box because on
			
		if(cb && typeof(cb) === "function") return cb();
		});
		
} // endPowerOn

function handleStateChange(state, id, cb) {
	if(blockXbox) return adapter.log.warn('[STATE] ' + id + ' change to ' + state + ' dropped, because Xbox blocked');
    blockXbox = true;
    let unblockXbox = setTimeout(() => blockXbox = false, 100); // box is blocked for 100 ms to avoid overload
	switch(id) {
		case 'settings.power':
			if(state) {
				powerOn();
			} else {
				adapter.getState('info.connection', (err, state) => {
					if(state.val) {
						adapter.log.debug('power off because connected');
						powerOff(liveId);
					} else {
						adapter.log.debug('connect before powering off');
						connect(liveId, () => {
							powerOff(liveId);
						});
					} // endElse
				});
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
	if(cb && typeof(cb) === "function") return cb();
} // endHandleStateChange

function sendButton(button, cb) {
	let endpoint = 'http://' + address + ':5557/device/' + liveId + '/input/' + button;
	
	request(endpoint, (error, response, body) => {
		if(error) adapter.log.error('[REQUEST] <=== ' + error.message);
		else if(JSON.parse(body).success) 
			adapter.log.debug('[REQUEST] <=== Button ' + button + ' acknowledged by REST-Server');
		else
			adapter.log.warn('[REQUEST] <=== Button ' + button + ' not acknowledged by REST-Server');
		
		if(cb && typeof(cb) === "function") return cb();
	});
} // endSendButton

function sendMediaCmd(cmd, cb) {
	let endpoint = 'http://' + address +':5557/device/' + liveId + '/media/' + cmd;
	
	request(endpoint, (error, response, body) => {
		if(error) adapter.log.error('[REQUEST] <=== ' + error.message);
		else if(JSON.parse(body).success) 
			adapter.log.debug('[REQUEST] <=== Media command ' + cmd + ' acknowledged by REST-Server');
		else
			adapter.log.warn('[REQUEST] <=== Media command ' + cmd + ' not acknowledged by REST-Server');
		if(cb && typeof(cb) === "function") return cb();
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
	
	let cmd = '/opt/iobroker/node_modules/iobroker.xbox/node_modules/nopy/src/nopy.js '
				+ '/opt/iobroker/node_modules/iobroker.xbox/python_modules/bin/xbox-rest-server';
	let started;
	
	exec(cmd, (error, stdout, stderr) => {
		if(error && !stderr.includes('REST server started')) {
			started = false;
		} else {
			started = true;
		} // endElse
		// Callback is only executed when program is finished/goes on
		if(cb && typeof(cb) === "function") return cb(started);
	});
	
} // endStartRestServer
