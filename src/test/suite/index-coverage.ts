import * as glob from "glob";
import * as Mocha from "mocha";
import * as path from "path";

function setupNyc() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NYC = require("nyc");
    // create an nyc instance, config here is the same as your package.json
    const nyc = new NYC({
        cache: false,
        cwd: path.resolve(__dirname, '../../..'),
        exclude: [
            ".attic",
            ".history",
            "node_modules",
            "out/test/**",
            ".vscode-test",
        ],
        extension: [
            ".ts",
            ".tsx",
        ],
        hookRequire: true,
        hookRunInContext: true,
        hookRunInThisContext: true,
        instrument: true,
        reporter: ["html"/*, "text"*/],
        require: [
            "ts-node/register",
        ],
        sourceMap: true,
    });
    nyc.reset();
    nyc.wrap();
    return nyc;
}

export function run(): Promise <void> {

    const nyc = setupNyc();

    // Create the mocha test
    const mocha = new Mocha({
        color: true,
        ui: "bdd",
        // get from env
        timeout: process.env.TEST_TIMEOUT || 5000,
    });

    const testsRoot = path.resolve(__dirname, "..");
    return new Promise((c, e) => {
        glob("**/**.test.js", {
            cwd: testsRoot
        }, (err, files) => {
            if (err) {
                return e(err);
            }

            // Add files to the test suite
            files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

            try {
                // Run the mocha test
                mocha.run(async (failures) => {
                    if (nyc) {
                        nyc.writeCoverageFile();
                        await nyc.report();
                    }

                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        c();
                    }
                });
            } catch (err) {
                console.error(err);
                e(err);
            }
        });
    });

}