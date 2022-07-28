"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
// @ts-expect-error currently provides no types
const xbox_smartglass_core_node_1 = __importDefault(require("xbox-smartglass-core-node"));
// @ts-expect-error currently provides no types
const xbox_webapi_1 = __importDefault(require("xbox-webapi"));
// @ts-expect-error currently provides no types
const systeminput_1 = __importDefault(require("xbox-smartglass-core-node/src/channels/systeminput"));
// @ts-expect-error currently provides no types
const systemmedia_1 = __importDefault(require("xbox-smartglass-core-node/src/channels/systemmedia"));
class Xbox extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: 'xbox'
        });
        this.xboxConnected = false;
        this.SGClient = (0, xbox_smartglass_core_node_1.default)();
        this.APIClient = (0, xbox_webapi_1.default)({
            clientId: '5e5ead27-ed60-482d-b3fc-702b28a97404',
            clientSecret: false
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        this.subscribeStates('*');
        await this.ensureMeta();
        await this.loadTokens();
        try {
            await this.APIClient.isAuthenticated();
            await this.setStateAsync('info.authenticated', true, true);
            this.log.info('User is authenticated with Xbox Live');
            await this.getModel();
            await this.setGamertag();
        }
        catch (e) {
            // it's not a real error has no message
            this.log.debug(`Error: ${JSON.stringify(e)}`);
            this.log.info(`Xbox login url available at: ${this.APIClient._authentication.generateAuthorizationUrl()}`);
            this.log.info('Copy the token after login into "apiToken" of the adapter config to enable the Xbox api');
            this.log.debug(`Current Token: ${this.config.apiToken}`);
            // tokens file did not work out, so we try via apiToken
            if (this.config.apiToken) {
                this.log.info('Trying authentication with current token');
                try {
                    const data = await this.APIClient._authentication.getTokenRequest(this.config.apiToken);
                    this.log.info('User is authenticated');
                    this.log.debug(`Got oauth token: ${JSON.stringify(data)}`);
                    this.APIClient._authentication._tokens.oauth = data;
                    await this.saveTokens(data);
                    await this.getModel();
                }
                catch (e) {
                    this.log.debug(`Error: ${e.body}`);
                    this.log.warn('User failed to authenticate.');
                }
            }
        }
        this.checkConnection();
    }
    /**
     * Checks and handles the connection periodically
     */
    async checkConnection() {
        this.log.debug(`Device status: ${this.xboxConnected ? 'Connected' : 'Disconnected'}`);
        if (this.xboxConnected) {
            this.log.debug(`SGClient connection status: ${this.SGClient._connection_status}`);
            this.log.debug(`SGClient isConnected: ${this.SGClient.isConnected()}`);
        }
        else {
            this.SGClient = (0, xbox_smartglass_core_node_1.default)();
            try {
                await this.SGClient.discovery(this.config.ip);
                this.log.debug(`Xbox found in network: ${this.config.ip}`);
                this.connectConsole();
            }
            catch (e) {
                this.log.warn(`Failed to discover Xbox on ip ${this.config.ip}: ${e}`);
                this.xboxConnected = false;
            }
        }
        this.connectionTimer = setTimeout(() => {
            this.checkConnection();
        }, 10000);
    }
    async connectConsole() {
        this.SGClient = (0, xbox_smartglass_core_node_1.default)();
        try {
            await this.SGClient.connect(this.config.ip);
            this.log.info(`Succesfully connected to Xbox on ip ${this.config.ip}`);
            this.xboxConnected = true;
            await this.setStateAsync('info.connection', true, true);
            // Setup Smartglass client config
            this.SGClient.addManager('system_input', (0, systeminput_1.default)());
            this.SGClient.addManager('system_media', (0, systemmedia_1.default)());
            // this.SGClient.addManager('tv_remote', TvRemoteChannel());
            this.SGClient.on('_on_timeout', async () => {
                this.log.info('Smartglass connection timeout detected. Reconnecting...');
                this.xboxConnected = false;
                await this.setStateAsync('info.connection', false, true);
                this.connectConsole();
            });
            this.SGClient.on('_on_console_status', async (resp) => {
                if (resp.packet_decoded.protected_payload.apps[0] !== undefined) {
                    const activeTitleId = resp.packet_decoded.protected_payload.apps[0].title_id;
                    const appInformation = await this.getAppInformation(activeTitleId);
                    await this.setStateAsync('info.activeTitleId', activeTitleId.toString(), true);
                    if (appInformation) {
                        await this.setStateAsync('info.activeTitleName', appInformation.shortTitle, true);
                        await this.setStateAsync('info.activeTitleImage', appInformation.imageUrl, true);
                        await this.setStateAsync('info.activeTitleType', appInformation.productType, true);
                    }
                }
            });
        }
        catch (e) {
            this.log.debug(`Failed to connect to xbox. Error: ${e.message}`);
            this.xboxConnected = false;
            await this.setStateAsync('info.connection', false, true);
        }
    }
    /**
     * Uses the offline title Id and gets the translated name from the Web API
     *
     * @param titleId id of the current title
     */
    async getAppInformation(titleId) {
        var _a;
        try {
            await this.APIClient.isAuthenticated();
            const res = await this.APIClient.getProvider('catalog').getProductFromAlternateId(titleId, 'XboxTitleId');
            if (res.Products[0] !== undefined) {
                this.log.debug(`getAppInformation returned app from xbox api: ${res.Products[0].LocalizedProperties[0].ShortTitle} for ${titleId}`);
                const imageUrl = ((_a = res.Products[0].LocalizedProperties[0].Images[0]) === null || _a === void 0 ? void 0 : _a.Uri) || '';
                const productType = res.Products[0].ProductType;
                return { shortTitle: res.Products[0].LocalizedProperties[0].ShortTitle, imageUrl, productType };
            }
        }
        catch (e) {
            // no real error with message
            this.log.debug(`No connection to webAPI: ${JSON.stringify(e)}`);
        }
    }
    /**
     * Gets information about the Xbox model
     */
    async getModel() {
        try {
            const res = await this.APIClient.getProvider('smartglass').getConsoleStatus(this.config.liveId);
            this.log.debug(`Got xbox console type from Xbox API: ${res.consoleType}`);
            let consoleType;
            switch (res.consoleType) {
                case 'XboxSeriesX':
                    consoleType = 'Xbox Series X';
                    break;
                case 'XboxSeriesS':
                    consoleType = 'Xbox Series S';
                    break;
                case 'XboxOne':
                    consoleType = 'Xbox One';
                    break;
                case 'XboxOneS':
                    consoleType = 'Xbox One S';
                    break;
                case 'XboxOneX':
                    consoleType = 'Xbox One X';
                    break;
                default:
                    consoleType = res.consoleType;
                    break;
            }
            await this.setStateAsync('info.consoleType', consoleType, true);
        }
        catch (e) {
            if (e.errorCode === 'XboxDataNotFound') {
                this.log.warn(`Console ID not found on connected xbox account. Live ID: ${this.config.liveId}`);
            }
            else {
                this.log.warn(`Failed to get Xbox console type from Xbox API: ${JSON.stringify(e)}`);
            }
            try {
                const res = await this.APIClient.getProvider('smartglass').getConsolesList();
                this.log.info('The following consoles are available on this account:');
                for (const console of Object.values(res.result)) {
                    // @ts-expect-error
                    this.log.info(`- ${console.id} - ${console.consoleType} - ${console.name}`);
                }
            }
            catch (e) {
                this.log.warn(`Failed to get list of consoles: ${JSON.stringify(e)}`);
            }
        }
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    async onUnload(callback) {
        try {
            if (this.connectionTimer) {
                clearTimeout(this.connectionTimer);
            }
            await this.setStateAsync('info.authenticated', false, true);
            await this.setStateAsync('info.connection', false, true);
            callback();
        }
        catch (_a) {
            callback();
        }
    }
    /**
     * Is called if a subscribed state changes
     */
    async onStateChange(id, state) {
        if (!state || state.ack) {
            return;
        }
        this.log.debug(`stateChange of "${id}": ${state.val}`);
        id = id.substring(this.namespace.length + 1); // remove instance name and id
        if (id === 'settings.power' && state.val) {
            // turning on xbox even if not connected
            this.powerOn();
            return;
        }
        if (!this.xboxConnected) {
            this.log.warn(`Ignoring state change of "${id}", because not connected`);
            return;
        }
        switch (id) {
            case 'settings.power':
                await this.powerOff();
                break;
            case 'gamepad.rightShoulder':
                await this.sendButton('right_shoulder');
                break;
            case 'gamepad.leftShoulder':
                await this.sendButton('left_shoulder');
                break;
            case 'gamepad.leftThumbstick':
                await this.sendButton('left_thumbstick');
                break;
            case 'gamepad.rightThumbstick':
                await this.sendButton('left_thumbstick');
                break;
            case 'gamepad.enroll':
                await this.sendButton('enroll');
                break;
            case 'gamepad.view':
                await this.sendButton('view');
                break;
            case 'gamepad.menu':
                await this.sendButton('menu');
                break;
            case 'gamepad.nexus':
                await this.sendButton('nexus');
                break;
            case 'gamepad.a':
                await this.sendButton('a');
                break;
            case 'gamepad.b':
                await this.sendButton('b');
                break;
            case 'gamepad.y':
                await this.sendButton('y');
                break;
            case 'gamepad.x':
                await this.sendButton('x');
                break;
            case 'gamepad.dpadUp':
                await this.sendButton('dpad_up');
                break;
            case 'gamepad.dpadDown':
                await this.sendButton('dpad_down');
                break;
            case 'gamepad.dpadLeft':
                await this.sendButton('dpad_left');
                break;
            case 'gamepad.dpadRight':
                await this.sendButton('dpad_right');
                break;
            case 'gamepad.clear':
                await this.sendButton('clear');
                break;
            case 'media.play':
                await this.sendMediaCmd('play');
                break;
            case 'media.pause':
                await this.sendMediaCmd('pause');
                break;
            case 'media.record':
                await this.sendMediaCmd('record');
                break;
            case 'media.playPause':
                await this.sendMediaCmd('play_pause');
                break;
            case 'media.previousTrack':
                await this.sendMediaCmd('prev_track');
                break;
            case 'media.seek':
                try {
                    /**
                     await this.sendCustomCommand(
                     'http://localhost:5557/device/${this.config.liveId}/media/seek/${state.val}'
                     );*/
                    this.log.warn('Not implemented');
                    this.setState(id, state.val, true);
                }
                catch (_a) {
                    // ignore
                }
                break;
            case 'media.channelUp':
                await this.sendMediaCmd('channel_up');
                break;
            case 'media.nextTrack':
                await this.sendMediaCmd('next_track');
                break;
            case 'media.channelDown':
                await this.sendMediaCmd('channel_down');
                break;
            case 'media.menu':
                await this.sendMediaCmd('menu');
                break;
            case 'media.back':
                await this.sendMediaCmd('back');
                break;
            case 'media.rewind':
                await this.sendMediaCmd('rewind');
                break;
            case 'media.view':
                await this.sendMediaCmd('view');
                break;
            case 'media.fastForward':
                await this.sendMediaCmd('fast_forward');
                break;
            case 'media.stop':
                await this.sendMediaCmd('stop');
                break;
            case 'settings.inputText':
                try {
                    /*
                    await this.sendCustomCommand(
                        'http://localhost:5557/device/${this.config.liveId}/text/${state.val}'
                    );*/
                    this.log.warn('Not implemented');
                    await this.setStateAsync(id, state, true);
                }
                catch (_b) {
                    // ignore
                }
                break;
            case 'settings.launchTitle':
                try {
                    await this.launchApplication(state.val);
                    await this.setStateAsync(id, state, true);
                }
                catch (_c) {
                    // ignore
                }
                break;
            case 'settings.gameDvr': {
                let query = 'start=-60&end=0'; // default
                if (typeof state.val === 'string' && state.val.includes(',')) {
                    const [start, end] = state.val.split(',');
                    query = `start=${start.trim()}&end=${end.trim()}`;
                }
                try {
                    this.log.warn(`not implemented: ${query}`);
                    //await this.sendCustomCommand('http://localhost:5557/device/${this.config.liveId}/gamedvr?${query}');
                }
                catch (_d) {
                    // ignore
                }
                break;
            }
            default:
                this.log.warn('[COMMAND] ===> Not a valid id: ${id}');
        } // endSwitch
    }
    /**
     * Tries to power on the Xbox first via Web API then via Smartglass
     */
    async powerOn() {
        // first try with web api
        try {
            await this.APIClient.isAuthenticated();
            await this.APIClient.getProvider('smartglass').powerOn(this.config.liveId);
            this.log.debug('Powered on xbox using Xbox api');
        }
        catch (e) {
            this.log.debug(`Failed to turn on Xbox using API: ${JSON.stringify(e)}`);
            // it failed so we use the SGClient
            try {
                await this.SGClient.powerOn({
                    tries: 10,
                    ip: this.config.ip,
                    live_id: this.config.liveId
                });
            }
            catch (e) {
                this.log.warn(`Could not power on Xbox: ${JSON.stringify(e)}`);
            }
        }
    }
    /**
     * Tries to power off Xbox first via Web API then via Smartglass
     */
    async powerOff() {
        try {
            // first try via API
            await this.APIClient.isAuthenticated();
            await this.APIClient.getProvider('smartglass').powerOff(this.config.liveId);
            this.log.debug('Powered off xbox using xbox api');
        }
        catch (e) {
            this.log.debug(`Failed to turn off xbox using xbox api: ${e}`);
            try {
                // no we try it via smartglass
                await this.SGClient.powerOff();
                this.log.debug('Powered off xbox using smartglass');
            }
            catch (e) {
                this.log.warn(`Could not turn off Xbox: ${e}`);
            }
        }
    }
    /**
     * Sends command via Media Manager
     *
     * @param command command to send via media manager
     */
    async sendMediaCmd(command) {
        try {
            await this.SGClient.getManager('system_media').sendCommand(command);
        }
        catch (e) {
            this.log.warn(`Could not send media command "${command}": ${JSON.stringify(e)}`);
        }
    }
    /**
     * Sends command via Input Manager
     *
     * @param command command to send via input manager
     */
    async sendButton(command) {
        try {
            await this.SGClient.getManager('system_input').sendCommand(command);
        }
        catch (e) {
            this.log.warn(`Could not send gamepad command "${command}": ${JSON.stringify(e)}`);
        }
    }
    /**
     * Launchs Title on the Xbox
     *
     * @param titleId title id of desired title
     */
    async launchApplication(titleId) {
        try {
            await this.APIClient.isAuthenticated();
            // e.g. 9WZDNCRFJ3TJ Netflix
            const res = await this.APIClient.getProvider('smartglass').launchApp(this.config.liveId, titleId);
            this.log.debug(`Launch application "${titleId}" result: ${JSON.stringify(res)}`);
        }
        catch (e) {
            this.log.warn(`Could not launch title: ${e}`);
        }
    }
    /**
     * Ensures that Xbox Meta object exists
     */
    async ensureMeta() {
        await this.setForeignObjectNotExistsAsync(this.name, {
            type: 'meta',
            common: {
                name: 'Xbox',
                type: 'meta.folder'
            },
            native: {}
        });
    }
    /**
     * Loads the tokens from ioBroker storage in the Xbox API
     */
    async loadTokens() {
        this.APIClient._authentication._tokensFile = '.tokens.json';
        try {
            const data = await this.readFileAsync(this.name, 'tokens.json');
            // @ts-expect-error
            this.APIClient._authentication._tokens.oauth = JSON.parse(data.file);
            this.log.info('Successfully loaded token');
        }
        catch (e) {
            this.log.debug(`No tokens to load: ${e.message}`);
        }
    }
    /**
     * Saves the tokens to ioBroker storage
     * @param tokens
     */
    async saveTokens(tokens) {
        await this.writeFileAsync(this.name, 'tokens.json', JSON.stringify(tokens, undefined, 2));
    }
    /**
     * Gets User profile information and sets gamertag accordingly
     */
    async setGamertag() {
        try {
            const res = await this.APIClient.getProvider('profile').getUserProfile();
            this.log.debug(`Gamertag response: ${JSON.stringify(res)}`);
            const gamertagObj = res.profileUsers[0].settings.find((val) => val.id === 'Gamertag');
            await this.setStateAsync('info.gamertag', gamertagObj.value, true);
        }
        catch (e) {
            this.log.debug(`Cannot retrive gamertag: ${JSON.stringify(e)}`);
        }
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new Xbox(options);
}
else {
    // otherwise start the instance directly
    (() => new Xbox())();
}
//# sourceMappingURL=main.js.map