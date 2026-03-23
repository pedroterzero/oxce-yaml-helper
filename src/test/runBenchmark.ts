import * as path from 'path';
import { runTests } from '@vscode/test-electron';

const ITERATIONS = parseInt(process.env.BENCHMARK_ITERATIONS || '5', 10);
const WORKSPACE = process.env.BENCHMARK_WORKSPACE || path.resolve('/home/peter/mods/Dioxine_XPiratez');
const GLOBAL_TIMEOUT_MS = parseInt(process.env.BENCHMARK_TIMEOUT || '900000', 10); // 15 min default

async function main() {
    const globalTimer = setTimeout(() => {
        console.error(`\nBenchmark global timeout (${GLOBAL_TIMEOUT_MS}ms) exceeded. Killing process.`);
        process.exit(2);
    }, GLOBAL_TIMEOUT_MS);
    globalTimer.unref();

    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/benchmark');

        console.log(`Running ${ITERATIONS} benchmark iterations against: ${WORKSPACE}`);

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [WORKSPACE, '--no-sandbox'],
            extensionTestsEnv: {
                BENCHMARK_ITERATIONS: String(ITERATIONS),
                BENCHMARK_WORKSPACE: WORKSPACE,
            },
        });
    } catch (err) {
        console.error(err);
        console.error('Failed to run benchmark');
        process.exit(1);
    }
}

main();
