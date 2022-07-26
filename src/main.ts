import * as utils from '@iobroker/adapter-core';
// @ts-expect-error currently provides no types
import Smartglass from 'xbox-smartglass-core-node';
// @ts-expect-error currently provides no types
import XboxApi from 'xbox-webapi';

class Xbox extends utils.Adapter {
    private SGClient = typeof Smartglass;
    private APIClient = typeof XboxApi;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'xbox'
        });

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
    private onReady(): void {
        this.log.info(`config ip: ${this.config.ip}`);
        this.log.info(`config liveId: ${this.config.liveId}`);

        this.subscribeStates('*');
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
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
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
