const ifaces = require('os').networkInterfaces();

// Iterate over interfaces ...
function getIP() {
    for (const _iface of ifaces) {
        // ... and find the one that matches the criteria
        const iface = _iface.filter(details => {
            return details.family === `IPv4` && details.internal === false;
        });

        if (iface.length > 0) {
            return iface[0].address;
        } // endIf
    } // endFor
} // endGetIP

exports.getIP = getIP;
