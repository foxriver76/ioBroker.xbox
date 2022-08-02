export declare const friendsStates: {
    readonly onlineStatus: {
        readonly type: "state";
        readonly common: {
            readonly name: "Online status";
            readonly role: "indicator.online";
            readonly type: "boolean";
            readonly read: false;
            readonly write: true;
        };
        readonly native: {};
    };
    readonly gamertag: {
        readonly type: "state";
        readonly common: {
            readonly name: "Gamertag";
            readonly role: "text";
            readonly type: "string";
            readonly read: false;
            readonly write: true;
        };
        readonly native: {};
    };
    readonly gamerscore: {
        readonly type: "state";
        readonly common: {
            readonly name: "Gamerscore";
            readonly role: "value";
            readonly type: "number";
            readonly read: false;
            readonly write: true;
        };
        readonly native: {};
    };
    readonly profilePicture: {
        readonly type: "state";
        readonly common: {
            readonly name: "URL to profile picture";
            readonly role: "icon";
            readonly type: "string";
            readonly read: false;
            readonly write: true;
        };
        readonly native: {};
    };
    readonly activeTitle: {
        readonly type: "state";
        readonly common: {
            readonly name: "Name of active title";
            readonly role: "text";
            readonly type: "string";
            readonly read: false;
            readonly write: true;
        };
        readonly native: {};
    };
};
