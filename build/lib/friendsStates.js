"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendsStates = void 0;
exports.friendsStates = {
    onlineStatus: {
        type: 'state',
        common: {
            name: 'Online status',
            role: 'indicator.online',
            type: 'boolean',
            read: false,
            write: true
        },
        native: {}
    },
    gamertag: {
        type: 'state',
        common: {
            name: 'Gamertag',
            role: 'text',
            type: 'string',
            read: false,
            write: true
        },
        native: {}
    },
    gamerscore: {
        type: 'state',
        common: {
            name: 'Gamerscore',
            role: 'value',
            type: 'number',
            read: false,
            write: true
        },
        native: {}
    },
    profilePicture: {
        type: 'state',
        common: {
            name: 'URL to profile picture',
            role: 'icon',
            type: 'string',
            read: false,
            write: true
        },
        native: {}
    },
    activeTitle: {
        type: 'state',
        common: {
            name: 'Name of active title',
            role: 'text',
            type: 'string',
            read: false,
            write: true
        },
        native: {}
    }
};
//# sourceMappingURL=friendsStates.js.map