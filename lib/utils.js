'use strict';

const os = require(`os`).platform();
const {exec} = require(`child_process`);

/**
 * Start the Xbox Smartglass rest server
 *
 * @alias startRestServer
 */
function startRestServer() {
    return new Promise((resolve, reject) => {

        if (os.startsWith(`win`)) {
            // Get correct python directory for windows
            exec(`dir /B ${__dirname}\\python_modules\\Python3`, (err, stdout, stderr) => {
                const winPath = stdout.replace(/[^ -~]+/g, ``) || `Python36`;
                const startCmd = `node  ${__dirname}\\..\\node_modules\\nopy\\src\\nopy.js ${__dirname}\\..\\python_modules\\${winPath}\\Scripts\\xbox-rest-server.exe \
                    || node ${__dirname}\\..\\..\\nopy\\src\\nopy.js ${__dirname}\\..\\python_modules\\${winPath}\\Scripts\\xbox-rest-server.exe`;

                exec(startCmd, (error, stdout, stderr) => {
                    let err = false;
                    if (error && !stderr.includes(`REST server started`)) {
                        err = stderr;
                    } // endIf
                    // Promise is only resolved when program is finished/goes on
                    if (!err) resolve();
                    else reject(err);
                });
            });

        } else {
            // Linux and MAC -- if not found in node_modules try root project
            const startCmd = `${__dirname}/../node_modules/nopy/src/nopy.js ${__dirname}/../python_modules/bin/xbox-rest-server \
                || ${__dirname}/../../nopy/src/nopy.js ${__dirname}/../python_modules/bin/xbox-rest-server`;

            exec(startCmd, (error, stdout, stderr) => {
                let err = false;
                if (error && !stderr.includes(`REST server started`)) {
                    err = stderr;
                } // endIf
                // Promise is only resolved when program is finished/goes on
                if (!err) resolve();
                else reject(err);
            });
        } // endElse
    });
} // endStartRestServer

module.exports = {
    startRestServer
};