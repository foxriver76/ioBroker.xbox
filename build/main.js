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
        this.log.info(`config ip: ${this.config.ip}`);
        this.log.info(`config liveId: ${this.config.liveId}`);
        this.subscribeStates('*');
        this.APIClient._authentication._tokensFile = '.tokens.json'; // TODO: Path to tokens file
        // or better this._tokens = content of tokens file read from iob storage?
        try {
            await this.APIClient.isAuthenticated();
            this.log.info('User is authenticated with Xbox Live');
            await this.getModel();
        }
        catch (e) {
            // it's not a real error has no message
            this.log.debug(`Error: ${e}`);
            this.log.info(`Xbox login url available at: ${this.APIClient._authentication.generateAuthorizationUrl()}`);
            this.log.info('Copy the token after login into "apiToken" of the adapter config to enable the Xbox api');
            this.log.debug(`Current Token: ${this.config.apiToken}`);
        }
        if (this.config.apiToken) {
            this.log.info('Trying authentication with current token');
            try {
                const data = await this.APIClient._authentication.getTokenRequest(this.config.apiToken);
                this.log.info('User is authenticated');
                this.log.debug(`Got oauth token: ${JSON.stringify(data)}`);
                this.APIClient._authentication._tokens.oauth = data;
                this.APIClient._authentication.saveTokens();
                await this.getModel();
            }
            catch (e) {
                this.log.debug(`Error: ${e.body}`);
                this.log.warn('User failed to authenticate.');
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
        setTimeout(() => {
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
            // this.SGClient.addManager('system_media', SystemMediaChannel());
            // this.SGClient.addManager('tv_remote', TvRemoteChannel());
            this.SGClient.on('_on_timeout', async () => {
                this.log.info('Smartglass connection timeout detected. Reconnecting...');
                this.xboxConnected = false;
                await this.setStateAsync('info.connection', false, true);
                this.connectConsole();
            });
            this.SGClient.on('_on_console_status', async (resp) => {
                if (resp.packet_decoded.protected_payload.apps[0] !== undefined) {
                    const currentTitleId = resp.packet_decoded.protected_payload.apps[0].title_id;
                    const activeTitleId = await this.getAppId(currentTitleId.toString());
                    await this.setStateAsync('info.activeTitleId', activeTitleId, true);
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
    async getAppId(titleId) {
        try {
            await this.APIClient.isAuthenticated();
            const res = await this.APIClient.getProvider('catalog').getProductFromAlternateId(titleId, 'XboxTitleId');
            if (res.Products[0] !== undefined) {
                this.log.debug(`getAppId returned app from xbox api: ${res.Products[0].LocalizedProperties[0].ShortTitle} for ${titleId}`);
                return res.Products[0].LocalizedProperties[0].ShortTitle;
            }
        }
        catch (e) {
            // no real error with message
            this.log.debug(`No connection to webAPI: ${e}`);
        }
        return titleId;
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
                this.log.warn(`Failed to get xbox console type from Xbox API: ${e.message}`);
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
                this.log.warn(`Failed to get list of consoles: ${e.message}`);
            }
        }
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            callback();
        }
        catch (_a) {
            callback();
        }
    }
    /**
     * Is called if a subscribed state changes
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        }
        else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
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