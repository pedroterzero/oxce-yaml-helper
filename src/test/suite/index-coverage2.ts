
import * as glob from "glob";
import * as Mocha from "mocha";
import * as path from "path";

function setupCoverage() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const NYC = require("nyc");
  const nyc = new NYC({
    all: true,
    cwd: path.join(__dirname, "..", "..", ".."),
    exclude: [".history/**", "**/test/**", ".vscode-test/**"],
    hookRequire: true,
    hookRunInContext: true,
    hookRunInThisContext: true,
    instrument: true,
    reporter: ["text", "html", "lcov", "json-summary"]
  });

  nyc.reset();
  nyc.wrap();

  return nyc;
}

export function run(): Promise<void> {
	// const nyc = process.env.COVERAGE ? setupCoverage() : null;
	const nyc = setupCoverage();

	// Create the mocha test
	const mocha = new Mocha({
		ui: 'bdd',
		timeout: 5000,
		// reporter: 'mocha-jenkins-reporter',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((c, e) => {
		glob('**/**.test.js', { cwd: testsRoot }, async (err, files) => {
			if (err) {
				return e(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			} catch (error) {
				e(error);
			} finally {
				if (nyc) {
					nyc.writeCoverageFile();
					await nyc.report();
				}
			}
		});
	});
}