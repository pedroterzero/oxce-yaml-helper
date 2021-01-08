import { readFileSync, writeFile } from 'fs-extra';
import * as path from 'path';

import { runTests } from 'vscode-test';

const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJsonData = readFileSync(packageJsonPath);

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // fix activation events, otherwise coverage does not work
    const parsed = JSON.parse(packageJsonData.toString());
    parsed.activationEvents = ['onStartupFinished'];
    await writeFile(packageJsonPath, JSON.stringify(parsed, null, 4));

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index-coverage');

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [path.resolve(__dirname, '../../src/test/suite/fixtures')]
    });
  } catch (err) {
    console.error(err);
    console.error('Failed to run tests');
    process.exit(1);
  } finally {
    await writeFile(packageJsonPath, packageJsonData.toString());
  }
}

main();