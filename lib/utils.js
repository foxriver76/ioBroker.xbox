'use strict';

const os = require(`os`).platform();
const { exec, spawn } = require(`child_process`);
const { normalize } = require('path');

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
                const startCmd = `node "${__dirname}\\..\\node_modules\\nopy\\src\\nopy.js"`;
                const alt = `node "${__dirname}\\..\\..\\nopy\\src\\nopy.js"`;
                const target = normalize(`${__dirname}\\..\\python_modules\\${winPath}\\Scripts\\xbox-rest-server.exe`);

                const server = await _startServer([startCmd, alt], target);
                resolve(server);
            });
        });
    } else {
        // Linux and MAC -- if not found in node_modules try root project
        const startCmd = normalize(`${__dirname}/../node_modules/nopy/src/nopy.js`);
        const alt = normalize(`${__dirname}/../../nopy/src/nopy.js`);
        const target = normalize(`${__dirname}/../python_modules/bin/xbox-rest-server`);

        const server = await _startServer([startCmd, alt], target);
        return Promise.resolve(server);
    } // endElse
} // endStartRestServer

/**
 * starts the server by executing given startCmd
 *
 * @param {string[]} cmds - array of nopy executables to be executed to start the rest server
 * @param {string} target - rest server path
 * @returns {Promise<void>}
 * @private
 */
async function _startServer(cmds, target) {
    return new Promise((resolve, reject) => {
        let errorCount = 0;
        let lastErr;

        const closeFun = code => {
            // if both process failed
            if (++errorCount === cmds.length) {
                reject(new Error(`Process exited with code ${code}: ${lastErr}`));
            }
        };

        for (const cmd of cmds) {
            const proc = spawn(cmd, [target], { windowsHide: true }).on('error', err => {
                // ignore
                lastErr = err;
            });

            proc.stderr.on('data', data => {
                if (data.toString().includes('Application startup complete')) {
                    // successfully started, remove our error listener
                    proc.removeListener('close', closeFun);
                    resolve(proc);
                }
                lastErr = data;
            });

            proc.stdout.on('data', data => {
                if (data.includes('Application startup complete')) {
                    // successfully started, remove our error listener
                    proc.removeListener('close', closeFun);
                    resolve(proc);
                }
            });

            proc.on('close', closeFun);
        }
    });
} // end_startServer

module.exports = {
    startRestServer
};
