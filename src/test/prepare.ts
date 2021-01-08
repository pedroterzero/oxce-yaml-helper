import { readFileSync, writeFile } from "fs-extra";
import path = require("path");

const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJsonData = readFileSync(packageJsonPath);

// fix activation events, otherwise coverage does not work
const parsed = JSON.parse(packageJsonData.toString());
parsed.activationEvents = ['onStartupFinished'];
(async () => {
    await Promise.all([
        writeFile(packageJsonPath + '.orig', packageJsonData.toString()),
        writeFile(packageJsonPath, JSON.stringify(parsed, null, 4)),
    ]);
})();
