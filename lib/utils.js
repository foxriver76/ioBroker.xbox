'use strict';

const os = require('os').platform();
const {exec} = require('child_process');

/**
 * Start the Xbox Smartglass rest server
 *
 * @alias startRestServer
 */
function startRestServer(cb) {
    return new Promise((resolve, reject) => {
        let startCmd;

        if (os.startsWith('win')) {
            // Windows
            startCmd = 'node ' + __dirname + '\\..\\node_modules\\nopy\\src\\nopy.js ' + __dirname + '\\..\\python_modules\\' + winPath + '\\Scripts\\xbox-rest-server.exe' +
                ' || ' + 'node ' + __dirname + '\\..\\..\\nopy\\src\\nopy.js ' + __dirname + '\\..\\python_modules\\' + winPath + '\\Scripts\\xbox-rest-server.exe';
        } else
        // Linux and MAC -- if not found in node_modules try root project
            startCmd = __dirname + '/../node_modules/nopy/src/nopy.js ' + __dirname + '/../python_modules/bin/xbox-rest-server' +
                ' || ' + __dirname + '/../../nopy/src/nopy.js ' + __dirname + '/../python_modules/bin/xbox-rest-server';

        exec(startCmd, (error, stdout, stderr) => {
            let err = false;
            if (error && !stderr.includes('REST server started')) {
                err = stderr;
            } // endIf
            // Promise is only resolved when program is finished/goes on
            if (!err) resolve();
            else reject(err);
        });
    });
} // endStartRestServer

module.exports = {
    startRestServer
};