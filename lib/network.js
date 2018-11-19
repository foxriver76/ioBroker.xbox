const os = require('os');
const ifaces = os.networkInterfaces();


// Iterate over interfaces ...
function getIP() {
    for (let dev in ifaces) {

        // ... and find the one that matches the criteria
        let iface = ifaces[dev].filter(function (details) {
            return details.family === 'IPv4' && details.internal === false;
        });

        if (iface.length > 0) {
            address = iface[0].address;
            return address;
        } // endIf
    } // endFor
} // endGetIP

exports.getIP = getIP;

