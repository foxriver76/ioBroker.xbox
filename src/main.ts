import * as utils from '@iobroker/adapter-core';
// @ts-expect-error currently provides no types
import Smartglass from 'xbox-smartglass-core-node';
// @ts-expect-error currently provides no types
import XboxApi from 'xbox-webapi';
// @ts-expect-error currently provides no types
import SystemInputChannel from 'xbox-smartglass-core-node/src/channels/systeminput';
// @ts-expect-error currently provides no types
import SystemMediaChannel from 'xbox-smartglass-core-node/src/channels/systemmedia';

interface AppInformation {
    /** Title of the active App */
    shortTitle: string;
    /** URL of first image */
    imageUrl: string;
    /** Product Type e.g. Game */
    productType: string;
    /** Unique ID to launch title */
    productId: string;
}

class Xbox extends utils.Adapter {
    private SGClient: typeof Smartglass;
    private APIClient: typeof XboxApi;
    private xboxConnected: boolean;
    private connectionTimer: NodeJS.Timeout | undefined;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'xbox'
        });

        this.xboxConnected = false;
        this.SGClient = Smartglass();
        this.APIClient = XboxApi({
            clientId: '5e5ead27-ed60-482d-b3fc-702b28a97404', // TODO: check
            clientSecret: false
        });

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        this.subscribeStates('*');

        await this.ensureMeta();
        await this.loadTokens();

        try {
            await this.APIClient.isAuthenticated();
            await this.setStateAsync('info.authenticated', true, true);
            this.log.info('User is authenticated with Xbox Live');
            await this.getModel();
            await this.setGamertag();
        } catch (e: any) {
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

                    this.APIClient._authentication._tokens.oauth = data;
                    this.log.info('User is authenticated');
                    this.log.debug(`Got oauth token: ${JSON.stringify(data)}`);

                    await this.setStateAsync('info.authenticated', true, true);

                    await this.saveTokens(data);

                    await this.getModel();
                    await this.setGamertag();
                } catch (e: any) {
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
    private async checkConnection() {
        this.log.debug(`Device status: ${this.xboxConnected ? 'Connected' : 'Disconnected'}`);
        if (this.xboxConnected) {
            this.log.debug(`SGClient connection status: ${this.SGClient._connection_status}`);
            this.log.debug(`SGClient isConnected: ${this.SGClient.isConnected()}`);
        } else {
            this.SGClient = Smartglass();

            try {
                await this.SGClient.discovery(this.config.ip);
                this.log.debug(`Xbox found in network: ${this.config.ip}`);
                this.connectConsole();
            } catch (e: any) {
                this.log.warn(`Failed to discover Xbox on ip ${this.config.ip}: ${e}`);
                this.xboxConnected = false;
            }
        }

        this.connectionTimer = setTimeout(() => {
            this.checkConnection();
        }, 10_000);
    }

    private async connectConsole() {
        this.SGClient = Smartglass();

        try {
            await this.SGClient.connect(this.config.ip);
            this.log.info(`Succesfully connected to Xbox on ip ${this.config.ip}`);
            this.xboxConnected = true;
            await this.setStateAsync('info.connection', true, true);

            // Setup Smartglass client config
            this.SGClient.addManager('system_input', SystemInputChannel());
            this.SGClient.addManager('system_media', SystemMediaChannel());
            // this.SGClient.addManager('tv_remote', TvRemoteChannel());

            this.SGClient.on('_on_timeout', async () => {
                this.log.info('Smartglass connection timeout detected. Reconnecting...');
                this.xboxConnected = false;
                await this.setStateAsync('info.connection', false, true);
                this.connectConsole();
            });

            this.SGClient.on('_on_console_status', async (resp: any) => {
                if (resp.packet_decoded.protected_payload.apps[0] !== undefined) {
                    const activeTitleId = resp.packet_decoded.protected_payload.apps[0].title_id;

                    const appInformation = await this.getAppInformation(activeTitleId);

                    if (appInformation) {
                        await this.setStateAsync('info.activeTitleId', appInformation.productId, true);
                        await this.setStateAsync('info.activeTitleName', appInformation.shortTitle, true);
                        await this.setStateAsync('info.activeTitleImage', appInformation.imageUrl, true);
                        await this.setStateAsync('info.activeTitleType', appInformation.productType, true);
                    }
                }
            });
        } catch (e: any) {
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
    private async getAppInformation(titleId: number): Promise<AppInformation | void> {
        try {
            await this.APIClient.isAuthenticated();

            const res = await this.APIClient.getProvider('catalog').getProductFromAlternateId(titleId, 'XboxTitleId');

            if (res.Products[0] !== undefined) {
                this.log.debug(
                    `getAppInformation returned app from xbox api: ${res.Products[0].LocalizedProperties[0].ShortTitle} for ${titleId}`
                );
                const imageUrl = res.Products[0].LocalizedProperties[0].Images[0]?.Uri || '';
                const productType = res.Products[0].ProductType;
                const productId = res.Products[0].ProductId;

                return {
                    shortTitle: res.Products[0].LocalizedProperties[0].ShortTitle,
                    imageUrl,
                    productType,
                    productId
                };
            }
        } catch (e: any) {
            // no real error with message
            this.log.debug(`No connection to webAPI: ${JSON.stringify(e)}`);
        }
    }

    /**
     * Gets information about the Xbox model
     */
    private async getModel() {
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
        } catch (e: any) {
            if (e.errorCode === 'XboxDataNotFound') {
                this.log.warn(`Console ID not found on connected xbox account. Live ID: ${this.config.liveId}`);
            } else {
                this.log.warn(`Failed to get Xbox console type from Xbox API: ${JSON.stringify(e)}`);
            }

            try {
                const res = await this.APIClient.getProvider('smartglass').getConsolesList();

                this.log.info('The following consoles are available on this account:');

                for (const console of Object.values(res.result)) {
                    // @ts-expect-error
                    this.log.info(`- ${console.id} - ${console.consoleType} - ${console.name}`);
                }
            } catch (e: any) {
                this.log.warn(`Failed to get list of consoles: ${JSON.stringify(e)}`);
            }
        }
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private async onUnload(callback: () => void): Promise<void> {
        try {
            if (this.connectionTimer) {
                clearTimeout(this.connectionTimer);
            }

            await this.setStateAsync('info.authenticated', false, true);
            await this.setStateAsync('info.connection', false, true);

            callback();
        } catch {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
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
                } catch {
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
                } catch {
                    // ignore
                }
                break;
            case 'settings.launchTitle':
                try {
                    await this.launchApplication(state.val as string);
                    await this.setStateAsync(id, state, true);
                } catch {
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
                } catch {
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
    private async powerOn() {
        // first try with web api
        try {
            await this.APIClient.isAuthenticated();
            await this.APIClient.getProvider('smartglass').powerOn(this.config.liveId);
            this.log.debug('Powered on xbox using Xbox api');
        } catch (e: any) {
            this.log.debug(`Failed to turn on Xbox using API: ${JSON.stringify(e)}`);
            // it failed so we use the SGClient
            try {
                await this.SGClient.powerOn({
                    tries: 10,
                    ip: this.config.ip,
                    live_id: this.config.liveId
                });
            } catch (e: any) {
                this.log.warn(`Could not power on Xbox: ${JSON.stringify(e)}`);
            }
        }
    }

    /**
     * Tries to power off Xbox first via Web API then via Smartglass
     */
    private async powerOff() {
        try {
            // first try via API
            await this.APIClient.isAuthenticated();
            await this.APIClient.getProvider('smartglass').powerOff(this.config.liveId);

            this.log.debug('Powered off xbox using xbox api');
        } catch (e: any) {
            this.log.debug(`Failed to turn off xbox using xbox api: ${JSON.stringify(e)}`);
            try {
                // no we try it via smartglass
                await this.SGClient.powerOff();
                this.log.debug('Powered off xbox using smartglass');
            } catch (e: any) {
                this.log.warn(`Could not turn off Xbox: ${e}`);
            }
        }
    }

    /**
     * Sends command via Media Manager
     *
     * @param command command to send via media manager
     */
    private async sendMediaCmd(command: string) {
        try {
            await this.SGClient.getManager('system_media').sendCommand(command);
        } catch (e: any) {
            this.log.warn(`Could not send media command "${command}": ${JSON.stringify(e)}`);
        }
    }

    /**
     * Sends command via Input Manager
     *
     * @param command command to send via input manager
     */
    private async sendButton(command: string) {
        try {
            await this.SGClient.getManager('system_input').sendCommand(command);
        } catch (e: any) {
            this.log.warn(`Could not send gamepad command "${command}": ${JSON.stringify(e)}`);
        }
    }

    /**
     * Launchs Title on the Xbox
     *
     * @param titleId title id of desired title
     */
    private async launchApplication(titleId: string) {
        try {
            await this.APIClient.isAuthenticated();
            // e.g. 9WZDNCRFJ3TJ Netflix
            const res = await this.APIClient.getProvider('smartglass').launchApp(this.config.liveId, titleId);
            this.log.debug(`Launch application "${titleId}" result: ${JSON.stringify(res)}`);
        } catch (e: any) {
            this.log.warn(`Could not launch title: ${JSON.stringify(e)}`);
        }
    }

    /**
     * Ensures that Xbox Meta object exists
     */
    private async ensureMeta(): Promise<void> {
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
    private async loadTokens(): Promise<void> {
        this.APIClient._authentication._tokensFile = '.tokens.json';
        try {
            const data = await this.readFileAsync(this.name, 'tokens.json');
            // @ts-expect-error
            this.APIClient._authentication._tokens.oauth = JSON.parse(data.file as string);
            this.log.info('Successfully loaded token');
        } catch (e: any) {
            this.log.debug(`No tokens to load: ${e.message}`);
        }
    }

    /**
     * Saves the tokens to ioBroker storage
     * @param tokens
     */
    private async saveTokens(tokens: Record<string, any>): Promise<void> {
        await this.writeFileAsync(this.name, 'tokens.json', JSON.stringify(tokens, undefined, 2));
    }

    /**
     * Gets User profile information and sets gamertag accordingly
     */
    private async setGamertag() {
        try {
            const res = await this.APIClient.getProvider('profile').getUserProfile();
            this.log.debug(`Gamertag response: ${JSON.stringify(res)}`);
            const gamertagObj = res.profileUsers[0].settings.find((val: Record<string, any>) => val.id === 'Gamertag');

            await this.setStateAsync('info.gamertag', gamertagObj.value, true);
        } catch (e) {
            this.log.debug(`Cannot retrive gamertag: ${JSON.stringify(e)}`);
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Xbox(options);
} else {
    // otherwise start the instance directly
    (() => new Xbox())();
}
