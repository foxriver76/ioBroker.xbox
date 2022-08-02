import * as utils from '@iobroker/adapter-core';
// @ts-expect-error currently provides no types
import Smartglass from 'xbox-smartglass-core-node';
// @ts-expect-error currently provides no types
import XboxApi from 'xbox-webapi';
// @ts-expect-error currently provides no types
import SystemInputChannel from 'xbox-smartglass-core-node/src/channels/systeminput';
// @ts-expect-error currently provides no types
import SystemMediaChannel from 'xbox-smartglass-core-node/src/channels/systemmedia';
import { friendsStates } from './lib/friendsStates';

interface AppInformation {
    /** Title of the active App */
    shortTitle: string;
    /** Product Type e.g. Game */
    productType: string;
    /** Unique ID to launch title */
    productId: string;
}

interface GetUserProfileResponse {
    profileUsers: UserProfileEntry[];
}

interface UserProfileEntry {
    id: string;
    hostId: string;
    settings: [
        /** Seems to be same as Gamertag */
        { id: 'GameDisplayName'; value: string },
        /** Url to gamertag image */
        { id: 'GameDisplayPicRaw'; value: string },
        /** Gamerscore represented as string */
        { id: 'Gamerscore'; value: string },
        /** Gamertag of the user */
        { id: 'Gamertag'; value: string }
    ];
    isSponsoredUser: boolean;
}

interface GetInstalledAppsResponse {
    status: StatusObject;
    result: InstalledAppsEntry[];
    agentUserId: null;
}

interface StatusObject {
    errorCode: string;
    errorMessage: string | null;
}

interface InstalledAppsEntry {
    oneStoreProductId: string | null;
    titleId: number;
    aumid: string | null;
    lastActiveTime: string | null;
    isGame: boolean;
    name: string;
    contentType: string;
    instanceId: string;
    storageDeviceId: string;
    uniqueId: string;
    legacyProductId: string | null;
    version: number;
    sizeInBytes: number;
    installTime: string;
    updateTime: string | null;
    /** If not null it is a DLC */
    parentId: string | null;
}

interface LaunchAppResponse {
    status: StatusObject;
    result: null;
    uiText: null;
    destination: DestinationObject;
    userInfo: null;
    opId: string;
}

type BooleanString = 'True' | 'False';

interface DestinationObject {
    id: string;
    name: string;
    locale: string;
    powerState: string;
    consoleType: string;
    remoteManagementEnabled: BooleanString;
    consoleStreamingEnabled: BooleanString;
    wirelessWarning: BooleanString;
    outOfHomeWarning: BooleanString;
    osVersion: string;
}

interface GetConsoleStatusResponse {
    status: StatusObject;
    id: string;
    name: string;
    locale: string;
    region: string;
    consoleType: string;
    powerState: string;
    playbackState: string;
    loginState: null;
    focusAppAumid: string;
    isTvConfigured: boolean;
    digitalAssistantRemoteControlEnabled: boolean;
    consoleStreamingEnabled: boolean;
    remoteManagementEnabled: boolean;
}

interface GetTitleIdResponse {
    xuid: string;
    titles: TitleEntry[];
}

interface TitleEntry {
    titleId: string;
    pfn: string;
    bingId: string;
    serviceConfigId: string;
    windowsPhoneProductId: null;
    name: string;
    type: string;
    devices: string[];
    /** URL to image */
    displayImage: string;
    mediaItemType: string;
    modernTitleId: string;
    isBundle: boolean;
    achievement: AchivementObject;
    stats: null;
    gamePass: null;
    images: ImagesEntry[];
    titleHistory: null;
    titleRecord: null;
    detail: TitleDetail;
    friendsWhoPlayed: null;
    alternateTitleIds: string[];
    contentBoards: null;
    xboxLiveTier: string;
}

interface AchivementObject {
    currentAchievements: number;
    totalAchievements: number;
    currentGamerscore: number;
    totalGamerscore: number;
    progressPercentage: number;
    sourceVersion: number;
}

interface ImagesEntry {
    url: string;
    type: string;
}

interface TitleDetail {
    attributes: AttributesEntry[];
    availabilities: AvailabilitiesEntry[];
    capabilities: unknown[];
    description: string;
    developerName: string;
    genres: string[];
    minAge: number;
    publisherName: string;
    releaseDate: string;
    shortDescription: string;
    vuiDisplayName: null;
    xboxLiveGoldRequired: boolean;
}

interface AttributesEntry {
    applicablePlatforms: null;
    maximum: number | null;
    minimum: number | null;
    name: string;
}

interface AvailabilitiesEntry {
    Actions: string[];
    AvailabilityId: string;
    Platforms: string[];
    SkuId: string;
    ProductId: string;
}

interface GetConsolesListResponse {
    status: StatusObject;
    result: ConsoleListResultEntry[];
    agentUserId: null;
}

interface ConsoleListResultEntry {
    /** The Live ID */
    id: string;
    name: string;
    locale: string;
    region: string;
    consoleType: string;
    powerState: string;
    digitalAssistantRemoteControlEnabled: boolean;
    remoteManagementEnabled: boolean;
    consoleStreamingEnabled: boolean;
    wirelessWarning: boolean;
    outOfHomeWarning: boolean;
    storageDevices: StorageDeviceEntry[];
}

interface StorageDeviceEntry {
    storageDeviceId: string;
    storageDeviceName: string;
    isDefault: boolean;
    freeSpaceBytes: number;
    totalSpaceBytes: number;
    isGen9Compatible: null;
}

interface GetProductFromAlternateIdResult {
    BigIds: string[];
    HasMorePages: boolean;
    Products: ProductsEntry[];
    TotalResultCount: number;
}

/** Note this one + subtypes are not fully modeled because it is very huge and contains lots of useless information */
interface ProductsEntry {
    LastModifiedDate: string;
    LocalizedProperties: LocalizedPropertiesEntry[];
    MarketProperties: MarketPropertiesEntry[];
    ProductType: string;
    ProductId: string;
}

interface LocalizedPropertiesEntry {
    DeveloperName: string;
    PublisherName: string;
    PublisherWebsiteUri: string;
    SupportUri: string;
    EligibilityProperties: EligibilityPropertiesEntry[];
    Franchises: unknown[];
    Images: LocalizedPropertiesImagesEntry[];
    Videos: LocalizedPropertiesVideosEntry[];
    ProductDescription: string;
    ProductTitle: string;
    ShortTitle: string;
    SortTitle: string;
    FriendlyTitle: null;
    ShortDescription: string;
    SearchTitles: SearchTitlesEntry[];
    VoiceTitle: string;
    RenderGroupDetails: null;
    ProductDisplayRanks: unknown[];
    InteractiveModelConfig: null;
    Interactive3DEnabled: boolean;
    Language: string;
    Markets: string[];
}

interface EligibilityPropertiesEntry {
    Remediations: RemediationsEntry[];
    Affirmations: AffirmationsEntry[];
}

interface RemediationsEntry {
    RemediationId: string;
    Description: string;
}

interface AffirmationsEntry {
    AffirmationId: string;
    AffirmationProductId: string;
    Description: string;
}

interface LocalizedPropertiesImagesEntry {
    FileId: string;
    EISListingIdentifier: null;
    BackgroundColor: string;
    Caption: string;
    FileSizeInBytes: number;
    ForegroundColor: string;
    Height: number;
    ImagePositionInfo: string;
    ImagePurpose: string;
    UnscaledImageSHA256Hash: string;
    Uri: string;
    Width: number;
}

interface LocalizedPropertiesVideosEntry {
    Uri: string;
    VideoPurpose: string;
    Height: number;
    Width: number;
    AudioEncoding: string;
    VideoEncoding: string;
    VideoPositionInfo: string;
    Caption: string;
    FileSizeInBytes: number;
    PreviewImage: PreviewImageObject;
    TrailerId: string;
    SortOrder: number;
}

interface PreviewImageObject {
    FileId: string;
    EISListingIdentifier: null;
    BackgroundColor: null;
    Caption: string;
    FileSizeInBytes: number;
    ForegroundColor: null;
    Height: number;
    ImagePositionInfo: null;
    ImagePurpose: string;
    UnscaledImageSHA256Hash: string;
    Uri: string;
    Width: number;
}

interface SearchTitlesEntry {
    SearchTitleString: string;
    SearchTitleType: string;
}

interface MarketPropertiesEntry {
    OriginalReleaseDate: string;
    MinimumUserAge: number;
    ContentRatings: ContentRatingsEntry[];
    RelatedProducts: RelatedProductsEntry[];
}

interface ContentRatingsEntry {
    RatingSystem: string;
    RatingId: string;
    RatingDescriptors: unknown[];
    RatingDisclaimers: unknown[];
    InteractiveElements: unknown[];
}

interface RelatedProductsEntry {
    RelatedProductId: string;
    RelationshipType: string;
}

interface GetFriendsResponse {
    people: FriendsEntry[];
    recommendationSummary: null;
    friendFinderState: null;
    accountLinkDetails: null;
}

interface FriendsEntry {
    xuid: string;
    isFavorite: boolean;
    isFollowingCaller: boolean;
    isFollowedByCaller: boolean;
    isIdentityShared: boolean;
    addedDateTimeUtc: string;
    /** Same as Gamertag */
    displayName: string;
    realName: string;
    /** URL to profile picture */
    displayPicRaw: string;
    showUserAsAvatar: string;
    gamertag: string;
    gamerScore: string;
    modernGamertag: string;
    modernGamertagSuffix: string;
    uniqueModernGamertag: string;
    xboxOneRep: string;
    /** e.g. Offline */
    presenceState: 'Online' | 'Offline';
    /** e.g. Offline or the active Game */
    presenceText: string;
    presenceDevices: null;
    isBroadcasting: boolean;
    isCloaked: null;
    isQuarantined: boolean;
    isXbox360Gamerpic: boolean;
    lastSeenDateTimeUtc: null | string;
    suggestion: null;
    recommendation: null;
    search: null;
    titleHistory: null;
    multiplayerSummary: MultiplayerSummaryObject;
    recentPlayer: null;
    follower: null;
    preferredColor: PreferredColorObject;
    presenceDetails: PresenceDetailsEntry[];
    titlePresence: null;
    titleSummaries: null;
    presenceTitleIds: null;
    detail: FriendsDetailObject;
    communityManagerTitles: null;
    socialManager: null;
    broadcast: null;
    tournamentSummary: null;
    avatar: null;
    linkedAccounts: LinkedAccountsEntry[];
    colorTheme: string;
    preferredFlag: string;
    preferredPlatforms: unknown[];
}

interface MultiplayerSummaryObject {
    InMultiplayerSession: number;
    InParty: number;
}

interface PreferredColorObject {
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
}

interface FriendsDetailObject {
    accountTier: string;
    bio: string;
    isVerified: boolean;
    location: string;
    tenure: string;
    watermarks: unknown[];
    blocked: boolean;
    mute: boolean;
    followerCount: number;
    followingCount: number;
    hasGamePass: boolean;
}

interface LinkedAccountsEntry {
    networkName: string;
    displayName: string;
    showOnProfile: boolean;
    isFamilyFriendly: boolean;
    deeplink: null;
}

interface PresenceDetailsEntry {
    IsBroadcasting: boolean;
    Device: string;
    PresenceText: string;
    State: string;
    TitleId: string;
    TitleType: null;
    IsPrimary: boolean;
    IsGame: boolean;
    RichPresenceText: null | string;
}

class Xbox extends utils.Adapter {
    private SGClient: typeof Smartglass;
    private APIClient: typeof XboxApi;
    private xboxConnected: boolean;
    private connectionTimer: NodeJS.Timeout | undefined;
    private pollAPITimer: NodeJS.Timeout | undefined;
    private readonly pollAPIInterval: number;
    private readonly checkConnectionInterval: number;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'xbox'
        });

        this.pollAPIInterval = 60_000 * 10;
        this.checkConnectionInterval = 10_000;
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
            // update token
            this.APIClient._authentication._tokens.oauth = await this.APIClient._authentication.refreshToken(
                this.APIClient._authentication._tokens.oauth.refresh_token
            );

            await this.APIClient.isAuthenticated();
            await this.setStateAsync('info.authenticated', true, true);
            this.log.info('User is authenticated with Xbox Live');
            await this.getModel();
            await this.setGamertag();
        } catch (e: any) {
            // it's not a real error has no message
            this.log.debug(`Error: ${this.errorToText(e)}`);
            this.log.info(`Xbox login url available at: ${this.APIClient._authentication.generateAuthorizationUrl()}`);
            this.log.info('Copy the token after login into "apiToken" of the adapter config to enable the Xbox api');
            this.log.debug(`Current Token: ${this.config.apiToken}`);

            // tokens file did not work out, so we try via apiToken
            if (this.config.apiToken) {
                this.log.info('Trying authentication with current token');
                try {
                    const data = await this.APIClient._authentication.getTokenRequest(this.config.apiToken);

                    this.APIClient._authentication._tokens.oauth = data;
                    this.log.debug(`Got oauth token: ${JSON.stringify(data)}`);
                    await this.saveTokens(data);

                    await this.APIClient.isAuthenticated();
                    this.log.info('User is authenticated');
                    await this.setStateAsync('info.authenticated', true, true);

                    await this.getModel();
                    await this.setGamertag();
                } catch (e: any) {
                    this.log.debug(`Error: ${e.body}`);
                    this.log.warn('User failed to authenticate.');
                }
            }
        }

        this.checkConnection();
        this.pollAPI();
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
        }, this.checkConnectionInterval);
    }

    private async connectConsole() {
        this.SGClient = Smartglass();

        try {
            await this.SGClient.connect(this.config.ip);
            this.log.info(`Succesfully connected to Xbox on ip ${this.config.ip}`);
            this.xboxConnected = true;
            await this.setStateAsync('info.connection', true, true);
            await this.setStateAsync('settings.power', true, true);

            // Setup Smartglass client config
            this.SGClient.addManager('system_input', SystemInputChannel());
            this.SGClient.addManager('system_media', SystemMediaChannel());
            // this.SGClient.addManager('tv_remote', TvRemoteChannel());

            this.SGClient.on('_on_timeout', async () => {
                this.log.info('Smartglass connection timeout detected. Reconnecting...');
                this.xboxConnected = false;
                await this.setStateAsync('info.connection', false, true);
                await this.setStateAsync('settings.power', false, true);
                this.connectConsole();
            });

            this.SGClient.on('_on_console_status', async (resp: any) => {
                if (resp.packet_decoded.protected_payload.apps[0] !== undefined) {
                    const activeTitleId = resp.packet_decoded.protected_payload.apps[0].title_id;

                    const appInformation = await this.getAppInformation(activeTitleId);
                    const imageUrl = await this.getImageUrl(activeTitleId);

                    if (appInformation) {
                        await this.setStateAsync('info.activeTitleId', appInformation.productId, true);
                        await this.setStateAsync('info.activeTitleName', appInformation.shortTitle, true);
                        await this.setStateAsync('info.activeTitleType', appInformation.productType, true);
                    }

                    if (imageUrl) {
                        await this.setStateAsync('info.activeTitleImage', imageUrl, true);
                    }
                }
            });
        } catch (e: any) {
            this.log.debug(`Failed to connect to xbox. Error: ${e.message}`);
            this.xboxConnected = false;
            await this.setStateAsync('info.connection', false, true);
            await this.setStateAsync('settings.power', false, true);
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

            const res: GetProductFromAlternateIdResult = await this.APIClient.getProvider(
                'catalog'
            ).getProductFromAlternateId(titleId, 'XboxTitleId');

            if (res.Products[0] !== undefined) {
                this.log.debug(
                    `getAppInformation returned app from xbox api: ${res.Products[0].LocalizedProperties[0].ShortTitle} for ${titleId}`
                );

                const productType = res.Products[0].ProductType;
                const productId = res.Products[0].ProductId;

                return {
                    shortTitle: res.Products[0].LocalizedProperties[0].ShortTitle,
                    productType,
                    productId
                };
            }
        } catch (e: any) {
            // no real error with message
            this.log.debug(`No connection to webAPI: ${this.errorToText(e)}`);
        }
    }

    /**
     * Gets information about the Xbox model
     */
    private async getModel() {
        try {
            const res: GetConsoleStatusResponse = await this.APIClient.getProvider('smartglass').getConsoleStatus(
                this.config.liveId
            );

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
                this.log.warn(`Failed to get Xbox console type from Xbox API: ${this.errorToText(e)}`);
            }

            try {
                const res: GetConsolesListResponse = await this.APIClient.getProvider('smartglass').getConsolesList();

                this.log.info('The following consoles are available on this account:');

                for (const console of Object.values(res.result)) {
                    this.log.info(`LiveID: ${console.id} (${console.consoleType} - ${console.name})`);
                }
            } catch (e: any) {
                this.log.warn(`Failed to get list of consoles: ${this.errorToText(e)}`);
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

            if (this.pollAPITimer) {
                clearTimeout(this.pollAPITimer);
            }

            await this.saveTokens(this.APIClient._authentication._tokens.oauth);

            await this.setStateAsync('info.authenticated', false, true);
            await this.setStateAsync('info.connection', false, true);
            await this.setStateAsync('settings.power', false, true);

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
            case 'settings.launchStoreTitle':
                try {
                    await this.launchStoreApplication(state.val as string);
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
            this.log.debug(`Failed to turn on Xbox using API: ${this.errorToText(e)}`);
            // it failed so we use the SGClient
            try {
                await this.SGClient.powerOn({
                    tries: 10,
                    ip: this.config.ip,
                    live_id: this.config.liveId
                });
            } catch (e: any) {
                this.log.warn(`Could not power on Xbox: ${this.errorToText(e)}`);
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
            this.log.debug(`Failed to turn off xbox using xbox api: ${this.errorToText(e)}`);
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
            this.log.warn(`Could not send media command "${command}": ${this.errorToText(e)}`);
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
            this.log.warn(`Could not send gamepad command "${command}": ${this.errorToText(e)}`);
        }
    }

    /**
     * Launchs Title on the Xbox by ID
     *
     * @param titleId title id of desired title
     */
    private async launchApplication(titleId: string): Promise<void> {
        try {
            await this.APIClient.isAuthenticated();
            // e.g. 9WZDNCRFJ3TJ Netflix
            const res: LaunchAppResponse = await this.APIClient.getProvider('smartglass').launchApp(
                this.config.liveId,
                titleId
            );
            this.log.debug(`Launch application "${titleId}" result: ${JSON.stringify(res)}`);
        } catch (e: any) {
            this.log.warn(`Could not launch title: ${this.errorToText(e)}`);
        }
    }

    /**
     * Launchs Title on Xbox by Store Name
     *
     * @param titleName name of the title to search for
     */
    private async launchStoreApplication(titleName: string): Promise<void> {
        try {
            await this.APIClient.isAuthenticated();
            const catalogRes = await this.APIClient.getProvider('catalog').searchTitle(titleName);

            let titleId = catalogRes.Results[0]?.Products[0].ProductId;

            if (catalogRes.Results.length > 1) {
                // multiple results see if one is installed to find a better matching title
                const res: GetInstalledAppsResponse = await this.APIClient.getProvider('smartglass').getInstalledApps(
                    this.config.liveId
                );
                for (const installedApp of res.result) {
                    try {
                        if (installedApp.parentId) {
                            // DLCs cannot be started directly
                            continue;
                        }

                        const res: GetTitleIdResponse = await this.APIClient.getProvider('titlehub').getTitleId(
                            installedApp.titleId
                        );

                        const installedProductId = res.titles[0].detail.availabilities[0].ProductId;

                        const matchingApplication = catalogRes.Results.find(
                            (entry: Record<string, any>) => entry.Products[0].ProductId === installedProductId
                        );

                        if (matchingApplication) {
                            titleId = matchingApplication.Products[0].ProductId;
                            break;
                        }
                    } catch (e) {
                        this.log.debug(`Error getting TitleId in launchStoreApplication: ${this.errorToText(e)}`);
                    }
                }
            }

            if (titleId) {
                this.log.debug(`Got ID "${titleId}" for "${titleName}" from store`);
                const res: LaunchAppResponse = await this.APIClient.getProvider('smartglass').launchApp(
                    this.config.liveId,
                    titleId
                );
                this.log.debug(`Launch application "${titleId}" result: ${JSON.stringify(res)}`);
            } else {
                this.log.warn(`No result found for "${titleName}"`);
            }
        } catch (e: any) {
            this.log.warn(`Could not launch title: ${this.errorToText(e)}`);
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
        this.log.info('Successfully saved tokens');
    }

    /**
     * Gets User profile information and sets gamertag accordingly
     */
    private async setGamertag() {
        try {
            const res: GetUserProfileResponse = await this.APIClient.getProvider('profile').getUserProfile();
            this.log.debug(`Gamertag response: ${JSON.stringify(res)}`);
            const gamertagObj = res.profileUsers[0].settings.find((val: Record<string, any>) => val.id === 'Gamertag');

            await this.setStateAsync('info.gamertag', gamertagObj!.value, true);
        } catch (e) {
            this.log.debug(`Cannot retrive gamertag: ${this.errorToText(e)}`);
        }
    }

    /**
     * Gets User profile information and sets gamerscore accordingly
     */
    private async setGamerscore() {
        try {
            const res: GetUserProfileResponse = await this.APIClient.getProvider('profile').getUserProfile();
            this.log.debug(`Gamerscore response: ${JSON.stringify(res)}`);
            const gamerscoreObj = res.profileUsers[0].settings.find(
                (val: Record<string, any>) => val.id === 'Gamerscore'
            );

            await this.setStateAsync('info.gamerscore', parseInt(gamerscoreObj!.value), true);
        } catch (e) {
            this.log.debug(`Cannot retrive gamerscore: ${this.errorToText(e)}`);
        }
    }

    /**
     * Gets installed apps and sets them comma separated
     */
    private async setInstalledApps() {
        try {
            const res: GetInstalledAppsResponse = await this.APIClient.getProvider('smartglass').getInstalledApps(
                this.config.liveId
            );
            this.log.debug(`Installed apps response: ${JSON.stringify(res)}`);

            // filter out dlcs
            const installedTitles = res.result.filter(entry => entry.parentId === null).map(entry => entry.name);

            await this.setStateAsync('info.installedApplications', installedTitles.join(', '), true);
        } catch (e) {
            this.log.debug(`Cannot retrive installed apps: ${this.errorToText(e)}`);
        }
    }
    /**
     * Gets all friends and sets them accordingly
     */
    private async setFriends(): Promise<void> {
        const res: GetFriendsResponse = await this.APIClient.getProvider('people').getFriends();
        // get all friends in iobroker, check if in API response, else delete
        const objectsRes = await this.getObjectViewAsync('system', 'channel', {
            startkey: `${this.namespace}.friends.`,
            endkey: `${this.namespace}.friends.\u9999`
        });

        const friendsNames = res.people.map(entry => entry.gamertag);
        /** Stores friends which exist in iob (forbidden chars replaced) */
        const adapterFriendsNames: string[] = [];

        for (const obj of objectsRes.rows) {
            const name = obj.id.split('.').pop() as string;
            adapterFriendsNames.push(name);

            if (!friendsNames.includes(name)) {
                // friend no longer in list
                this.log.info(`Friend "${name}" has been removed from list`);
                await this.delObjectAsync(`friends.${name}`, { recursive: true });
            }
        }

        for (const friend of res.people) {
            // set not exists friend
            if (!adapterFriendsNames.includes(friend.gamertag.replace(this.FORBIDDEN_CHARS, '_'))) {
                await this.createFriend(friend.gamertag);
            }

            await this.setStateAsync(`friends.${friend.gamertag}.presenceStatus`, friend.presenceText, true);
            await this.setStateAsync(`friends.${friend.gamertag}.profilePicture`, friend.displayPicRaw, true);
            await this.setStateAsync(`friends.${friend.gamertag}.gamerscore`, parseInt(friend.gamerScore), true);
            await this.setStateAsync(`friends.${friend.gamertag}.gamertag`, friend.gamertag, true);
            await this.setStateAsync(
                `friends.${friend.gamertag}.onlineStatus`,
                friend.presenceState === 'Online',
                true
            );
        }
    }

    /**
     * Creates state objects for a given friend
     *
     * @param friend name of the friend
     */
    private async createFriend(friend: string): Promise<void> {
        this.log.info(`Create objects for friend "${friend}"`);

        friend = friend.replace(this.FORBIDDEN_CHARS, '_');

        await this.setObjectAsync(`friends.${friend}`, {
            type: 'channel',
            common: {
                name: friend
            },
            native: {}
        });

        for (const [id, state] of Object.entries(friendsStates)) {
            await this.setObjectAsync(`friends.${friend}.${id}`, state);
        }
    }

    /**
     * Checks if a real error was thrown and returns message then, else it stringifies
     *
     * @param error any kind of thrown error
     */
    private errorToText(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        } else {
            return JSON.stringify(error);
        }
    }

    /**
     * Poll states from API and syncs them to ioBroker states
     */
    private async pollAPI(): Promise<void> {
        try {
            await this.APIClient.isAuthenticated();
            await this.setGamerscore();
            await this.setInstalledApps();
            await this.setFriends();
        } catch (e) {
            this.log.warn(`Could not poll API: ${this.errorToText(e)}`);
        }

        this.pollAPITimer = setTimeout(() => {
            this.pollAPI();
        }, this.pollAPIInterval);
    }

    /**
     * Gets the url of the display image for a titleId
     * @param titleId id of the title
     */
    private async getImageUrl(titleId: string): Promise<string | void> {
        try {
            const titleRes: GetTitleIdResponse = await this.APIClient.getProvider('titlehub').getTitleId(titleId);
            return titleRes.titles[0].displayImage;
        } catch (e) {
            this.log.warn(`Could not get image url for "${titleId}": ${this.errorToText(e)}`);
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
