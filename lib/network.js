const os = require('os');
const ifaces = os.networkInterfaces();

// Iterate over interfaces ...
function getIP() {
    for (const dev in ifaces) {

        // ... and find the one that matches the criteria
        const iface = ifaces[dev].filter(function (details) {
            return details.family === 'IPv4' && details.internal === false;
        });

        if (iface.length > 0) {
            return iface[0].address;
        } // endIf
    } // endFor
} // endGetIP

exports.getIP = getIP;

