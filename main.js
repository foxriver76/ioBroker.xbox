/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
const adapter = new utils.Adapter('xbox');
const { exec } = require('child_process');
const request = require('request');

let liveId;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', callback => {
    try {
    	// TODO: check windows
    	exec('pkill xbox', (error, stdout, stderr) => {
    		if(!error) adapter.log.info('Rest server stopped');
    		else adapter.log.warn(stderr);
    	});
    	adapter.setState('info.connection', false, true);
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', (id, obj) => {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

adapter.on('stateChange', (id, state) => {
    adapter.log.debug('[COMMAND] State Change - ID: ' + id + '; State: ' + state.val);
    if (!id || !state || state.ack) return; // Ignore acknowledged state changes or error states   
    
    state = state.val;
    id = id.substring(adapter.namespace.length + 1); // remove instance name and id
    
    switch(id) {
		case 'settings.power':
			if(state) {
				powerOn();
				powerOn();
				powerOn();
				powerOn();
				powerOn();
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
			
		default:
			adapter.log.warn('Not a valid id: ' + id)
    } // endSwitch
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
	if(!liveId) {
		adapter.log.warn('Please provide a Xbox Live ID');
		return;
	} else adapter.log.debug('Live ID is ' + liveId);
	
	exec('xbox-rest-server', (error, stdout, stderr) => {
		if(error) {
			adapter.log.error('[START] ' + stderr);
		} // endIf
	});
	adapter.log.info('[START] Starting rest server')
    setTimeout(() => main(), 5000); // give server time to start
});

function main() {
	
    adapter.subscribeStates('*');
	discover(); // Search for devices


} // endMain

function connect(liveid, cb) {
	discover(() => {
		let statusURL = 'http://localhost:5557/device/' + liveId + '/connect';
		
		request(statusURL, (error, response, body) => {
			if(!error) {
				if(response.success) adapter.setState('info.connection', true, true);
				else {
					adapter.log.warn('[CONNECT] <=== ' + body);
					adapter.setState('info.connection', false, true);
				} //endElse
			} else {
				adapter.log.error('[CONNECT] <=== ' + error.message);
				adapter.setState('info.connection', false, true);
			}
		});
		
		if(cb && typeof(cb) === "function") return cb();
	});
} // endConnect

function powerOff(liveId, cb) {
	
	let statusURL = 'http://localhost:5557/device/' + liveId + '/poweroff';
	
	request(statusURL, (error, response, body) => {
		if(!error) {
			if(body.success) adapter.setState('settings.power', false, true);
			else {
				adapter.log.warn('[POWEROFF] <=== ' + body);
			} //endElse
		} else {
			adapter.log.error('[POWEROFF] <=== ' + error.message);
		}
	});
	
	if(cb && typeof(cb) === "function") return cb();
} // endPowerOff

function discover(cb) {
	let statusURL = 'http://localhost:5557/device';
	
	request(statusURL, (error, response, body) => {
		if(!error) {
				adapter.log.info(body);
		} else {
			adapter.log.error('[CONNECT] <=== ' + error.message);
			adapter.setState('info.connection', false, true);
		}
	});
		
	if(cb && typeof(cb) === "function") return cb();
} // endDiscover

function powerOn(cb) {
		let statusURL = 'http://localhost:5557/device/' + liveId + '/poweron'
		
		request(statusURL, (error, response, body) => {
			if(error) adapter.log.error('[REQUEST] <=== ' + error.message);
			// Ping to check if it is powered on and set state
		});
	
	if(cb && typeof(cb) === "function") return cb();
 } // endPowerOn
