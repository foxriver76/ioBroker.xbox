'use strict';

const os = require(`os`).platform();
const {exec} = require(`child_process`);

/**
 * Start the Xbox Smartglass rest server
 *
 * @returns {Promise<void>}
 */
async function startRestServer() {
    if (os.startsWith(`win`)) {
        // Get correct python directory for windows
        return new Promise(resolve => {
            exec(`dir /B "${__dirname}\\python_modules\\Python3*"`, async (err, stdout) => {
                const winPath = stdout.replace(/[^ -~]+/g, ``) || `Python36`;
                const startCmd = `node  "${__dirname}\\..\\node_modules\\nopy\\src\\nopy.js" "${__dirname}\\..\\python_modules\\${winPath}\\Scripts\\xbox-rest-server.exe" \
                    || node "${__dirname}\\..\\..\\nopy\\src\\nopy.js" "${__dirname}\\..\\python_modules\\${winPath}\\Scripts\\xbox-rest-server.exe"`;

                const server = await _startServer(startCmd);
                resolve(server);
            });
        });
    } else {
        // Linux and MAC -- if not found in node_modules try root project
        const startCmd = `${__dirname}/../node_modules/nopy/src/nopy.js ${__dirname}/../python_modules/bin/xbox-rest-server \
                || ${__dirname}/../../nopy/src/nopy.js ${__dirname}/../python_modules/bin/xbox-rest-server`;

        const server = await _startServer(startCmd);
        return Promise.resolve(server);
    } // endElse
} // endStartRestServer

/**
 * starts the server by executing given startCmd
 *
 * @param {string} startCmd command to execute to start the rest server
 * @returns {Promise<void>}
 * @private
 */
async function _startServer(startCmd) {
    return new Promise((resolve, reject) => {
        exec(startCmd, (error, stdout, stderr) => {
            let err = false;
            if (error && !stderr.includes(`REST server started`) && !stderr.includes(`Token Auth failed`)) {
                err = stderr;
            } // endIf
            // Promise is only resolved when program is finished/goes on
            if (!err) {
                resolve();
            } else {
                reject(err);
            }
        });
    });
} // end_startServer

module.exports = {
    startRestServer
};
