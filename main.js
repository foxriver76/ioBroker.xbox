/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const utils = require(`@iobroker/adapter-core`); // Get common adapter utils
const {exec} = require(`child_process`);
const helper = require(`${__dirname}/lib/utils`);
const ping = require(`ping`);
const os = require(`os`).platform();
const axios = require('axios');

const restServerAddress = `localhost`; // host of the REST server
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
let onlineInterval;
let restartTimer;
let startTimer;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: `xbox`
    });

    adapter = new utils.Adapter(options);

    adapter.on(`unload`, async callback => {
        try {
            let killCmd;

            // clear intervals and timers on unload
            if (onlineInterval) {
                clearInterval(onlineInterval);
            }
            if (restartTimer) {
                clearTimeout(restartTimer);
            }
            if (startTimer) {
                clearTimeout(startTimer);
            }

            adapter.setState(`info.connection`, false, true);
            adapter.setState(`settings.power`, false, true);

            if (os.startsWith(`win`)) {
                // Windows
                killCmd = `taskkill /F /PID ${restServerPid}`;
            } else {
                // Linux and Mac
                killCmd = `pkill -f xbox-rest-server`;
            } // endElse

            exec(killCmd, async (error, stdout, stderr) => {

                if (!error) {
                    adapter.log.info(`[END] REST server stopped`);
                } else {
                    adapter.log.info(`[END] Could not stop REST server: ${stderr}`);
                } // endElse

                const promises = [];
                promises.push(adapter.setStateAsync(`info.connection`, false, true));
                promises.push(adapter.setStateAsync(`info.activeTitleImage`, ``, true));
                promises.push(adapter.setStateAsync(`info.activeTitleName`, ``, true));
                promises.push(adapter.setStateAsync(`info.activeTitleId`, ``, true));
                promises.push(adapter.setStateAsync(`info.currentTitles`, `{}`, true));
                promises.push(adapter.setStateAsync(`info.activeTitleType`, ``, true));

                await Promise.all(promises);

                adapter.log.info(`[END] cleaned everything up...`);
                callback();
            });
        } catch {
            callback();
        } // endTryCatch
    });

    adapter.on('message', async obj => {
        adapter.log.debug(`[MSSG] Received: ${JSON.stringify(obj)}`);
        if (obj.command === 'auth') {
            try {
                await checkLoggedIn();
                adapter.sendTo(obj.from, obj.command, {authActive: true}, obj.callback);
            } catch (e) {
                adapter.sendTo(obj.from, obj.command, {
                    authActive: false,
                    redirect: e.redirectUri
                }, obj.callback);
            }
        } else {
            adapter.log.warn(`Unknown message command ${obj.command}`);
        }
    });

    adapter.on(`stateChange`, async (id, state) => {
        if (!id || !state || state.ack) {
            return;
        } // Ignore acknowledged state changes or error states

        adapter.log.debug(`[COMMAND] State Change - ID: ${id}; State: ${state.val}`);

        const stateVal = state.val;
        id = id.substring(adapter.namespace.length + 1); // remove instance name and id

        if (stateVal && id === `settings.power`) {
            handleStateChange(stateVal, id);
        } else {
            const state = await adapter.getStateAsync(`info.connection`);
            if (state.val) {
                handleStateChange(stateVal, id);
            } else {
                adapter.log.warn(`[COMMAND] ===> Can not handle id change ${id} with value ${stateVal} because not connected`);
            }
        } // endElse
    });

    adapter.on(`ready`, async () => {
        ip = adapter.config.ip;
        liveId = adapter.config.liveId;
        authenticate = adapter.config.authenticate || false;
        mail = adapter.config.mail || ``;
        password = adapter.config.password || ``;

        if (!ip || !liveId) {
            adapter.log.warn(`Please provide the ip address and the Live ID of your console`);
            return;
        } else {
            adapter.log.debug(`[START] IP address is ${ip}`);
            adapter.log.info(`[START] Starting REST server`);
        } // endElse

        try {
            await helper.startRestServer();
            adapter.log.info(`[START] Successfully started REST server`);
        } catch (e) {
            adapter.log.error(`[START] Failed starting REST server: ${e.message}`);
            adapter.log.error(`[START] Restarting adapter`);
            // clear the checking interval
            if (onlineInterval) {
                clearInterval(onlineInterval);
                onlineInterval = null;
            } // endIf
            return void adapter.restart();
        }

        // create device namespace
        adapter.setForeignObjectNotExists(adapter.namespace, {
            type: `device`,
            common: {
                name: `Xbox device`
            }
        });

        await prepareAuthentication(authenticate);

        main();
    });

    return adapter;
} // endStartAdapter

async function main() {
    if (startTimer) {
        clearTimeout(startTimer);
        startTimer = null;
    }
    adapter.subscribeStates(`*`);

    // Authenticate on Xbox Live, make sure to be logged out first
    if (authenticate) {
        try {
            await checkLoggedIn(true);
        } catch (e) {
            adapter.log.warn(`Not logged in, authenticate at ${e.redirectUri}`);
        }
    } // endIf

    // Get Rest Server PID once for killing on windows
    if (os.startsWith(`win`)) {
        exec(`wmic process get processid, commandline | findstr "^py *xbox-rest-server.exe>"`, (err, stdout) => {
            restServerPid = stdout.split(`.exe`)[1].replace(/\s+/g, ``);
            adapter.log.debug(`[START] REST-Server is running as ${restServerPid}`);
        });
    } // endIf

    onlineInterval = setInterval(() => { // check online
        ping.sys.probe(ip, async isAlive => {
            try {
                await checkLoggedIn();
            } catch (e) {
                adapter.log.debug(`[CHECK] Auth is not established: ${e.message}`);
            }

            if (isAlive || xboxAvailable) {

                if (xboxAvailable) {
                    adapter.setStateChanged(`settings.power`, true, true);
                }

                xboxPingable = true;
                if (isAlive) {
                    adapter.log.debug(`[PING] Xbox online`);
                } else {
                    adapter.log.debug(`[PING] Xbox offline, but marked available`);
                }

                const connectionState = await connect(ip);
                // check if connection is (still) established
                if (connectionState === `Connected`) {
                    try {
                        const res = await axios.get(`http://${restServerAddress}:5557/device/${liveId}/console_status`);

                        const currentTitles = res.data.active_titles;
                        const currentTitlesState = {};
                        let activeName = ``;
                        let activeHex = ``;
                        let activeImage = ``;
                        let activeType = ``;
                        for (const title of currentTitles) {
                            const titleName = title.name.split(`_`)[0];
                            const titleHex = parseInt(title.title_id).toString(16);
                            currentTitlesState[titleName] = titleHex;
                            if (title.has_focus) {
                                activeName = titleName;
                                activeHex = titleHex;
                                activeImage = title.image || ``;
                                activeType = title.type || ``;
                            } // endIf
                        } // endFor
                        adapter.log.debug(`[STATUS] Set ${JSON.stringify(currentTitlesState)}`);

                        adapter.setStateChanged(`info.currentTitles`, JSON.stringify(currentTitlesState), true);
                        adapter.setStateChanged(`info.activeTitleName`, activeName, true);
                        adapter.setStateChanged(`info.activeTitleId`, activeHex, true);
                        adapter.setStateChanged(`info.activeTitleImage`, activeImage, true);
                        adapter.setStateChanged(`info.activeTitleType`, activeType, true);
                    } catch (e) {
                        adapter.log.warn(`[STATUS] <=== Error getting status: ${e.message}`);
                    }
                } // endIf
            } else {
                adapter.getStateAsync(`info.connection`).then(state => {
                    if ((!state || state.val) && !xboxAvailable) {
                        adapter.setState(`info.connection`, false, true);
                        adapter.setState(`info.activeTitleImage`, ``, true);
                        adapter.setState(`info.activeTitleName`, ``, true);
                        adapter.setState(`info.activeTitleId`, ``, true);
                        adapter.setState(`info.currentTitles`, `{}`, true);
                        adapter.setState(`info.activeTitleType`, ``, true);

                        adapter.log.info(`[PING] Lost connection to your Xbox (${ip})`);
                        firstReconnectAttempt = true;
                    } // endIf
                });
                adapter.getStateAsync(`settings.power`).then(state => {
                    if (!state || (state.val && !xboxAvailable)) {
                        adapter.setState(`settings.power`, false, true);
                    }
                });
                xboxPingable = false;
                adapter.log.debug(`[PING] Xbox offline`);
            } // endElse
        });
    }, 6000);

} // endMain

async function connect(ip) {
    const result = await discoverAndUpdateConsole(ip);
    const statusURL = `http://${restServerAddress}:5557/device/${liveId}/connect`;

    adapter.log.debug(`[CONNECT] Check connection`);

    if (result.connectionState === `Error`) {
        adapter.log.warn(`[CONNECT] Error with rest server, restarting adapter`);
        return void adapter.restart();
    } // endIf

    // Set device status to var to not only rely on ping to check if Xbox is online
    xboxAvailable = result.device && result.device.device_status === `Available`;

    if (result.connectionState && result.connectionState !== `Disconnected`) {
        adapter.getStateAsync(`info.connection`).then(state => {
            if (state.val && result.connectionState === `Connected`) {
                adapter.log.debug(`[CONNECT] Still connected`);
            } else if (result.connectionState === `Connecting`) {
                adapter.log.debug(`[CONNECT] Currently connecting`);
            } else {
                adapter.setState(`info.connection`, true, true);
                adapter.log.info(`[CONNECT] <=== Successfully connected to ${liveId} (${result.device.ip_address})`);
            } // endIf

            return result.connectionState;
        });
    } else {
        const state = await adapter.getStateAsync(`info.connection`);
        if (!state || state.val) {
            adapter.setState(`info.connection`, false, true);
            adapter.setState(`info.activeTitleImage`, ``, true);
            adapter.setState(`info.activeTitleName`, ``, true);
            adapter.setState(`info.activeTitleId`, ``, true);
            adapter.setState(`info.currentTitles`, `{}`, true);
            adapter.setState(`info.activeTitleType`, ``, true);
            adapter.log.info(`[CONNECT] <=== Lost connection to your Xbox (${ip})`);
            firstReconnectAttempt = true;
        } // endIf

        if (liveId && result.device && result.device.device_status === `Available`) {
            try {
                const response = await axios.get(statusURL);
                if (response.data.success) {
                    adapter.setState(`info.connection`, true, true);
                    adapter.log.info(`[CONNECT] <=== Successfully connected to ${liveId} (${result.device.ip_address})`);
                    result.connectionState = true;
                } else {
                    if (firstReconnectAttempt) {
                        adapter.log.warn(`[CONNECT] <=== Connection to your Xbox failed: ${response.data.message}`);
                    } else {
                        adapter.log.debug(`[CONNECT] <=== Connection to your Xbox failed: ${response.data.message}`);
                    }
                    adapter.setState(`info.connection`, false, true);
                    result.connectionState = false;
                } //endElse
            } catch (e) {
                adapter.log.error(`[CONNECT] <=== ${e.message}`);
                adapter.setState(`info.connection`, false, true);
                result.connectionState = false;
                if (e.message.includes(`ECONNREFUSED`)) {
                    adapter.log.error(`[CONNECT] REST server seems to be down, adapter will be restarted`);
                    return void adapter.restart();
                } // endIf
            } // endElse
            return result.connectionState;
        } else if (result.device && result.device.device_status === `Unavailable`) {
            adapter.log.debug(`[CONNECT] Console currently unavailable`);
        } else if (firstReconnectAttempt) {
            adapter.log.warn(`[CONNECT] Ping response, but provided LiveID has not been discovered until now`);
            firstReconnectAttempt = false;
        } else {
            adapter.log.debug(`[CONNECT] Ping response, but provided LiveID has not been discovered until now`);
        }
    } // endElse
} // endConnect

/**
 * Power off console
 * @param {string} liveId - liveId of the console
 * @returns {Promise<void>}
 */
async function powerOff(liveId) {
    const endpoint = `http://${restServerAddress}:5557/device/${liveId}/poweroff`;
    adapter.log.debug(`[POWEROFF] Powering off Xbox (${ip})`);

    try {
        const res = await axios.get(endpoint);
        if (!res.data.success) {
            adapter.log.warn(`[POWEROFF] <=== ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        adapter.log.error(`[POWEROFF] <=== ${e.message}`);
    }
} // endPowerOff

/**
 * Discover configured console by ip or check if connection is alive
 *
 * @param {string} ip - ip address of Xbox
 * @returns {Promise<{discovered: boolean, connectionState: boolean, device: *}>}
 */
async function discoverAndUpdateConsole(ip) { // is used by connect
    const state = await adapter.getStateAsync(`info.connection`);
    let endpoint;
    if (!state || !state.val) {
        endpoint = `http://${restServerAddress}:5557/device?addr=${ip}`;
        adapter.log.debug(`[DISCOVER] Searching for consoles`);
    } else {
        endpoint = `http://${restServerAddress}:5557/device/${liveId}`;
        adapter.log.debug(`[UPDATE] Check console status`);
    } // endElse
    let connectionState = false;
    let discovered = false;
    let device = null;

    try {
        const res = await axios.get(endpoint);
        const jsonBody = res.data;
        if (state && state.val) {
            // already connected
            try {
                device = jsonBody;
                liveId = jsonBody.liveid;
                connectionState = jsonBody.connection_state;
                adapter.log.debug(`[UPDATE] <=== ${JSON.stringify(jsonBody)}`);
            } catch (e) {
                adapter.log.debug(`[UPDATE] <=== ${JSON.stringify(jsonBody)}`);
            }
        } else {
            try {
                for (const i of Object.keys(jsonBody)) {
                    if (jsonBody[i].ip_address === ip) {
                        liveId = jsonBody[i].liveid;
                        discovered = true;
                        connectionState = jsonBody[i].connection_state;
                        device = jsonBody[i];
                        break;
                    } // endIf
                } // endFor

                adapter.log.debug(`[DISCOVER] <=== ${JSON.stringify(jsonBody.devices)}`);
            } catch (e) {
                adapter.log.error(`[DISCOVER] <=== Error on discovery: ${e.message}`);
            }
        }
    } catch (e) {
        adapter.log.error(`[DISCOVER] <=== ${e.message}`);
        adapter.setState(`info.connection`, false, true);
    }

    return {connectionState, discovered, device};
} // endDiscover

/**
 * Try to powerOn the Xbox for 17.5 seconds
 *
 * @returns {Promise<void>}
 */
async function powerOn() {
    if (!tryPowerOn) { // if Xbox isn't on after 17.5 seconds, stop trying
        tryPowerOn = setTimeout(() => tryPowerOn = false, 17500);
    } // endIf
    adapter.log.debug(`[POWERON] Powering on console`);
    blockXbox = true;

    try {
        await axios.get(`http://${restServerAddress}:5557/device/${liveId}/poweron?addr=${ip}`);
    } catch (e) {
        adapter.log.error(`[REQUEST] <=== ${e.message}`);
    }

    if (!xboxPingable) {
        if (tryPowerOn) {
            await powerOn();
        } else {
            adapter.log.warn(`[REQUEST] <=== Could not turn on Xbox`);
            blockXbox = false;
        } // endElse
    } else {
        blockXbox = false;
    } // unblock Box because on
} // endPowerOn

/**
 * Handle state change and send command to Xbox if matching
 * @param {any} state - state value
 * @param {string} id - id of state
 * @returns {Promise<void>}
 */
async function handleStateChange(state, id) {
    if (blockXbox) {
        return adapter.log.warn(`[STATE] ${id} change to ${state.val} dropped, because Xbox blocked`);
    }
    blockXbox = setTimeout(() => blockXbox = false, 100); // box is blocked for 100 ms to avoid overload

    switch (id) {
        case `settings.power`:
            if (state) {
                await powerOn();
            } else {
                await powerOff(liveId);
            } // endElse
            break;
        case `gamepad.rightShoulder`:
            await sendButton(`right_shoulder`);
            break;
        case `gamepad.leftShoulder`:
            await sendButton(`left_shoulder`);
            break;
        case `gamepad.leftThumbstick`:
            await sendButton(`left_thumbstick`);
            break;
        case `gamepad.rightThumbstick`:
            await sendButton(`left_thumbstick`);
            break;
        case `gamepad.enroll`:
            await sendButton(`enroll`);
            break;
        case `gamepad.view`:
            await sendButton(`view`);
            break;
        case `gamepad.menu`:
            await sendButton(`menu`);
            break;
        case `gamepad.nexus`:
            await sendButton(`nexus`);
            break;
        case `gamepad.a`:
            await sendButton(`a`);
            break;
        case `gamepad.b`:
            await sendButton(`b`);
            break;
        case `gamepad.y`:
            await sendButton(`y`);
            break;
        case `gamepad.x`:
            await sendButton(`x`);
            break;
        case `gamepad.dpadUp`:
            await sendButton(`dpad_up`);
            break;
        case `gamepad.dpadDown`:
            await sendButton(`dpad_down`);
            break;
        case `gamepad.dpadLeft`:
            await sendButton(`dpad_left`);
            break;
        case `gamepad.dpadRight`:
            await sendButton(`dpad_right`);
            break;
        case `gamepad.clear`:
            await sendButton(`clear`);
            break;
        case `media.play`:
            await sendMediaCmd(`play`);
            break;
        case `media.pause`:
            await sendMediaCmd(`pause`);
            break;
        case `media.record`:
            await sendMediaCmd(`record`);
            break;
        case `media.playPause`:
            await sendMediaCmd(`play_pause`);
            break;
        case `media.previousTrack`:
            await sendMediaCmd(`prev_track`);
            break;
        case `media.seek`:
            try {
                await sendCustomCommand(`http://${restServerAddress}:5557/device/${liveId}/media/seek/${state}`);
                adapter.setState(id, state, true);
            } catch {
                // ignore
            }
            break;
        case `media.channelUp`:
            await sendMediaCmd(`channel_up`);
            break;
        case `media.nextTrack`:
            await sendMediaCmd(`next_track`);
            break;
        case `media.channelDown`:
            await sendMediaCmd(`channel_down`);
            break;
        case `media.menu`:
            await sendMediaCmd(`menu`);
            break;
        case `media.back`:
            await sendMediaCmd(`back`);
            break;
        case `media.rewind`:
            await sendMediaCmd(`rewind`);
            break;
        case `media.view`:
            await sendMediaCmd(`view`);
            break;
        case `media.fastForward`:
            await sendMediaCmd(`fast_forward`);
            break;
        case `media.stop`:
            await sendMediaCmd(`stop`);
            break;
        case `settings.inputText`:
            try {
                await sendCustomCommand(`http://${restServerAddress}:5557/device/${liveId}/text/${state}`);
                adapter.setState(id, state, true);
            } catch {
                // ignore
            }
            break;
        case `settings.launchTitle`:
            try {
                await sendCustomCommand(`http://${restServerAddress}:5557/device/${liveId}/launch/ms-xbl-${state}://`);
                adapter.setState(id, state, true);
            } catch {
                // ignore
            }
            break;
        case `settings.gameDvr`: {
            let query = 'start=-60&end=0'; // default
            if (typeof state === 'string' && state.includes(',')) {
                const [start, end] = state.split(',');
                query = `start=${start.trim()}&end=${end.trim()}`;
            }
            try {
                await sendCustomCommand(`http://${restServerAddress}:5557/device/${liveId}/gamedvr?${query}`);
            } catch {
                // ignore
            }
            break;
        }
        default:
            adapter.log.warn(`[COMMAND] ===> Not a valid id: ${id}`);
    } // endSwitch
} // endHandleStateChange

/**
 * Simulate button press on Xbox
 *
 * @param {string} button - button to simulate
 * @returns {Promise<void>}
 */
async function sendButton(button) {
    try {
        const response = await axios.get(`http://${restServerAddress}:5557/device/${liveId}/input/${button}`);
        if (response.data.success) {
            adapter.log.debug(`[REQUEST] <=== Button ${button} acknowledged by REST-Server`);
        } else {
            adapter.log.warn(`[REQUEST] <=== Button ${button} not acknowledged by REST-Server`);
        }
    } catch (e) {
        adapter.log.error(`[REQUEST] <=== ${e.message}`);
    }
} // endSendButton

/**
 * Send media button command to Xbox
 *
 * @param {string} cmd - media command to send
 * @returns {Promise<void>}
 */
async function sendMediaCmd(cmd) {
    try {
        const response = await axios.get(`http://${restServerAddress}:5557/device/${liveId}/media/${cmd}`);
        if (response.data.success) {
            adapter.log.debug(`[REQUEST] <=== Media command ${cmd} acknowledged by REST-Server`);
        } else {
            adapter.log.warn(`[REQUEST] <=== Media command ${cmd} not acknowledged by REST-Server`);
        }
    } catch (e) {
        adapter.log.error(`[REQUEST] <=== ${e.message}`);
    }
} // endSendMediaCmd

/**
 * Send custom command to Xbox
 *
 * @param {string} endpoint - endpoint to make GET request to
 * @returns {Promise<void>}
 */
async function sendCustomCommand(endpoint) {
    try {
        const response = await axios.get(endpoint);
        if (response.statusCode === 200 && response.data.success) {
            adapter.log.debug(`[REQUEST] <=== Custom Command ${endpoint} acknowledged by REST-Server`);
        } else {
            adapter.log.warn(`[REQUEST] <=== Custom command ${endpoint} not acknowledged by REST-Server`);
        } // endElse
    } catch (e) {
        adapter.log.error(`[REQUEST] <=== Custom request error: ${e.message}`);
        throw e;
    }
} // endSendCustomCommand

function decrypt(key, value) {
    let result = ``;
    for (let i = 0; i < value.length; ++i) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
} // endDecrypt

/**
 * Check if logged in and set states accordingly
 *
 * @param {boolean} firstAttempt - if true log the gamertag and update auth state in all cases
 * @returns {Promise<void>}
 */
async function checkLoggedIn(firstAttempt) {
    let res = {};
    try {
        res = await axios.get(`http://${restServerAddress}:5557/auth`);
    } catch (e) {
        res.status = e.response.status;
    }

    if (res && res.status === 200) {
        const respBody = res.data;
        const username = respBody.xsts.DisplayClaims.xui[0].gtg;

        const state = await adapter.getStateAsync(`info.authenticated`);
        if (!state || !state.val || firstAttempt) {
            adapter.setState(`info.authenticated`, true, true);
            adapter.log.info(`[LOGIN] Successfully logged in as ${username}`);
        } // endIf
        adapter.setStateChanged(`info.gamertag`, username, true);
    } else {
        let redirectUri;
        try {
            const res = await axios.get(`http://${restServerAddress}:5557/auth/login`);
            redirectUri = res.request.res.responseUrl;
        } catch (e) {
            adapter.log.error(`Could not get redirectUri: ${e}`);
        }
        if (firstAttempt) {
            adapter.log.warn(`Could not login, please check adapter config. Code: ${res.status}`);
        }
        const state = await adapter.getStateAsync(`info.authenticated`);

        adapter.setStateChanged(`info.gamertag`, ``, true);
        if (!state || state.val) {
            adapter.setState(`info.authenticated`, false, true);
            adapter.log.info(`[CHECK] Auth is broken or logged out`);
            const err = new Error(`Auth broken`);
            err.redirectUri = redirectUri;
            throw err;
        } else {
            const err = new Error(`Auth still not established`);
            err.redirectUri = redirectUri;
            throw err;
        }
    } // endElse
} // endCheckLoggedIn

/*
function loadToken() {
    return new Promise((resolve, reject) => {
        request(`http://${restServerAddress}:5557/auth/load`, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                adapter.log.debug(`[TOKEN] <=== Successfully loaded token`);
                adapter.setState(`info.authenticated`, true, true);
                request(`http://${restServerAddress}:5557/auth`, (err, response, body) => {
                    if (!err && JSON.parse(body).authenticated) {
                        adapter.log.debug(`[TOKEN] <=== Successfully retrieved gamertag`);
                        adapter.setState(`info.gamertag`, JSON.parse(body).userinfo.gtg, true);
                        resolve();
                    } else {
                        adapter.log.warn(`[TOKEN] <=== Error retrieving gamertag: ${body}`);
                        reject(new Error(`Error retrieving gamertag: ${body}`));
                    } // endElse
                });
            } else {
                adapter.log.warn(`[TOKEN] Error loading token: ${body}`);
                reject(new Error(`Error loading token: ${body}`));
            } // endElse
        });
    });
} // endLoadToken
*/

/**
 * Prepares authentication by creating states or deleting states depending on passed authentication flag
 *
 * @param {boolean} authenticate - if true creates auth states, else deletes them
 * @return {Promise<void>}
 */
async function prepareAuthentication(authenticate) {
    if (authenticate) {
        const promises = [];
        // create Auth-Only Objects
        promises.push(adapter.setObjectNotExistsAsync(`info.authenticated`, {
            type: `state`,
            common: {
                name: `Xbox Live authenticated`,
                role: `indicator.authenticated`,
                type: `boolean`,
                read: true,
                write: false,
                def: false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync(`info.activeTitleImage`, {
            type: `state`,
            common: {
                name: `Active title image`,
                role: `icon`,
                type: `string`,
                read: true,
                write: false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync(`info.gamertag`, {
            type: `state`,
            common: {
                name: `Authenticated Gamertag`,
                role: `name.user`,
                type: `string`,
                read: true,
                write: false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync(`settings.gameDvr`, {
            type: `state`,
            common: {
                name: `Game Recorder`,
                role: `button`,
                type: `string`,
                read: true,
                write: true
            },
            native: {}
        }));

        promises.push(new Promise(resolve => {
            adapter.getForeignObjectAsync(`system.config`).then(obj => {
                if (obj && obj.native && obj.native.secret) {
                    password = decrypt(obj.native.secret, password);
                    mail = decrypt(obj.native.secret, mail);
                    resolve();
                } else {
                    password = decrypt(`Zgfr56gFe87jJOM`, password);
                    mail = decrypt(`Zgfr56gFe87jJOM`, mail);
                    resolve();
                } // endElse
            });
        }));

        await Promise.all(promises);
        return Promise.resolve();
    } else {
        // del Objects
        const promises = [];
        promises.push(adapter.delObjectAsync(`info.authenticated`));
        promises.push(adapter.delObjectAsync(`info.gamertag`));
        promises.push(adapter.delObjectAsync(`info.activeTitleImage`));
        promises.push(adapter.delObjectAsync(`info.gameDvr`));

        try {
            await Promise.all(promises);
        } catch {
            // ignore
        }
        return Promise.resolve();
    } // endElse
} // endPrepareAuthentication

// If started as allInOne/compact mode => return function to create instance
if (typeof module !== `undefined` && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} // endElse
