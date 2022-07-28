import * as utils from '@iobroker/adapter-core';
// @ts-expect-error currently provides no types
import Smartglass from 'xbox-smartglass-core-node';
// @ts-expect-error currently provides no types
import XboxApi from 'xbox-webapi';
// @ts-expect-error currently provides no types
import SystemInputChannel from 'xbox-smartglass-core-node/src/channels/systeminput';

class Xbox extends utils.Adapter {
    private SGClient: typeof Smartglass;
    private APIClient: typeof XboxApi;
    private xboxConnected: boolean;

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
        this.log.info(`config ip: ${this.config.ip}`);
        this.log.info(`config liveId: ${this.config.liveId}`);

        this.subscribeStates('*');

        this.APIClient._authentication._tokensFile = '.tokens.json'; // TODO: Path to tokens file
        // or better this._tokens = content of tokens file read from iob storage?

        try {
            await this.APIClient.isAuthenticated();
            this.log.info('User is authenticated with Xbox Live');
            await this.getModel();
        } catch (e: any) {
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
            } catch (e: any) {
                this.log.debug(`Error: ${e.body}`);
                this.log.warn('User failed to authenticate.');
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

        setTimeout(() => {
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
            // this.SGClient.addManager('system_media', SystemMediaChannel());
            // this.SGClient.addManager('tv_remote', TvRemoteChannel());

            this.SGClient.on('_on_timeout', async () => {
                this.log.info('Smartglass connection timeout detected. Reconnecting...');
                this.xboxConnected = false;
                await this.setStateAsync('info.connection', false, true);
                this.connectConsole();
            });

            this.SGClient.on('_on_console_status', async (resp: any) => {
                if (resp.packet_decoded.protected_payload.apps[0] !== undefined) {
                    const currentTitleId = resp.packet_decoded.protected_payload.apps[0].title_id;

                    const activeTitleId = await this.getAppId(currentTitleId.toString());

                    await this.setStateAsync('info.activeTitleId', activeTitleId, true);
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
    private async getAppId(titleId: string): Promise<string> {
        try {
            await this.APIClient.isAuthenticated();
            const res = await this.APIClient.getProvider('catalog').getProductFromAlternateId(titleId, 'XboxTitleId');

            if (res.Products[0] !== undefined) {
                this.log.debug(
                    `getAppId returned app from xbox api: ${res.Products[0].LocalizedProperties[0].ShortTitle} for ${titleId}`
                );
                return res.Products[0].LocalizedProperties[0].ShortTitle;
            }
        } catch (e: any) {
            // no real error with message
            this.log.debug(`No connection to webAPI: ${e}`);
        }

        return titleId;
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
                this.log.warn(`Failed to get xbox console type from Xbox API: ${e.message}`);
            }

            try {
                const res = await this.APIClient.getProvider('smartglass').getConsolesList();

                this.log.info('The following consoles are available on this account:');

                for (const console of Object.values(res.result)) {
                    // @ts-expect-error
                    this.log.info(`- ${console.id} - ${console.consoleType} - ${console.name}`);
                }
            } catch (e: any) {
                this.log.warn(`Failed to get list of consoles: ${e.message}`);
            }
        }
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
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
            return;
            this.powerOn();
        }

        if (!this.xboxConnected) {
            this.log.warn(`Ignoring state change of "${id}", because not connected`);
            return;
        }

        switch (id) {
            case `settings.power`:
                await this.powerOff();
                break;
            case `gamepad.rightShoulder`:
                await this.sendButton(`right_shoulder`);
                break;
            case `gamepad.leftShoulder`:
                await this.sendButton(`left_shoulder`);
                break;
            case `gamepad.leftThumbstick`:
                await this.sendButton(`left_thumbstick`);
                break;
            case `gamepad.rightThumbstick`:
                await this.sendButton(`left_thumbstick`);
                break;
            case `gamepad.enroll`:
                await this.sendButton(`enroll`);
                break;
            case `gamepad.view`:
                await this.sendButton(`view`);
                break;
            case `gamepad.menu`:
                await this.sendButton(`menu`);
                break;
            case `gamepad.nexus`:
                await this.sendButton(`nexus`);
                break;
            case `gamepad.a`:
                await this.sendButton(`a`);
                break;
            case `gamepad.b`:
                await this.sendButton(`b`);
                break;
            case `gamepad.y`:
                await this.sendButton(`y`);
                break;
            case `gamepad.x`:
                await this.sendButton(`x`);
                break;
            case `gamepad.dpadUp`:
                await this.sendButton(`dpad_up`);
                break;
            case `gamepad.dpadDown`:
                await this.sendButton(`dpad_down`);
                break;
            case `gamepad.dpadLeft`:
                await this.sendButton(`dpad_left`);
                break;
            case `gamepad.dpadRight`:
                await this.sendButton(`dpad_right`);
                break;
            case `gamepad.clear`:
                await this.sendButton(`clear`);
                break;
            case `media.play`:
                await this.sendMediaCmd(`play`);
                break;
            case `media.pause`:
                await this.sendMediaCmd(`pause`);
                break;
            case `media.record`:
                await this.sendMediaCmd(`record`);
                break;
            case `media.playPause`:
                await this.sendMediaCmd(`play_pause`);
                break;
            case `media.previousTrack`:
                await this.sendMediaCmd(`prev_track`);
                break;
            case `media.seek`:
                try {
                    await this.sendCustomCommand(
                        `http://localhost:5557/device/${this.config.liveId}/media/seek/${state.val}`
                    );
                    this.setState(id, state, true);
                } catch {
                    // ignore
                }
                break;
            case `media.channelUp`:
                await this.sendMediaCmd(`channel_up`);
                break;
            case `media.nextTrack`:
                await this.sendMediaCmd(`next_track`);
                break;
            case `media.channelDown`:
                await this.sendMediaCmd(`channel_down`);
                break;
            case `media.menu`:
                await this.sendMediaCmd(`menu`);
                break;
            case `media.back`:
                await this.sendMediaCmd(`back`);
                break;
            case `media.rewind`:
                await this.sendMediaCmd(`rewind`);
                break;
            case `media.view`:
                await this.sendMediaCmd(`view`);
                break;
            case `media.fastForward`:
                await this.sendMediaCmd(`fast_forward`);
                break;
            case `media.stop`:
                await this.sendMediaCmd(`stop`);
                break;
            case `settings.inputText`:
                try {
                    await this.sendCustomCommand(
                        `http://localhost:5557/device/${this.config.liveId}/text/${state.val}`
                    );
                    await this.setStateAsync(id, state, true);
                } catch {
                    // ignore
                }
                break;
            case `settings.launchTitle`:
                try {
                    await this.sendCustomCommand(
                        `http://localhost:5557/device/${this.config.liveId}/launch/ms-xbl-${state.val}://`
                    );
                    await this.setStateAsync(id, state, true);
                } catch {
                    // ignore
                }
                break;
            case `settings.gameDvr`: {
                let query = 'start=-60&end=0'; // default
                if (typeof state.val === 'string' && state.val.includes(',')) {
                    const [start, end] = state.val.split(',');
                    query = `start=${start.trim()}&end=${end.trim()}`;
                }
                try {
                    await this.sendCustomCommand(`http://localhost:5557/device/${this.config.liveId}/gamedvr?${query}`);
                } catch {
                    // ignore
                }
                break;
            }
            default:
                this.log.warn(`[COMMAND] ===> Not a valid id: ${id}`);
        } // endSwitch
    }

    private powerOn() {
        // TODO
    }

    private sendMediaCmd() {
        // TODO
    }

    private sendButton() {
        // TODO
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Xbox(options);
} else {
    // otherwise start the instance directly
    (() => new Xbox())();
}