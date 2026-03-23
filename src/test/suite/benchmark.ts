import * as fs from 'fs';
import * as path from 'path';
import { rulesetResolver } from '../../extension';
import { perfTimer } from '../../performanceTimer';

type BenchmarkReport = ReturnType<typeof perfTimer.report>;

const LOAD_TIMEOUT_MS = 120_000; // 2 minutes per load
const INIT_TIMEOUT_MS = 180_000; // 3 minutes for initial extension load

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms);
        promise.then(
            (v) => {
                clearTimeout(timer);
                resolve(v);
            },
            (e) => {
                clearTimeout(timer);
                reject(e);
            },
        );
    });
};

const waitForExtensionLoad = (resolver: typeof rulesetResolver): Promise<void> => {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (resolver.isLoaded()) {
                clearInterval(interval);
                resolve();
            }
        }, 50);
    });
};

export async function run(): Promise<void> {
    const iterations = parseInt(process.env.BENCHMARK_ITERATIONS || '5', 10);

    console.log('Waiting for initial extension load...');
    await withTimeout(waitForExtensionLoad(rulesetResolver), INIT_TIMEOUT_MS, 'initial extension load');
    console.log('Extension loaded. Starting benchmark iterations.');

    const reports: BenchmarkReport[] = [];

    for (let i = 0; i < iterations; i++) {
        console.log(`\n--- Iteration ${i + 1}/${iterations} ---`);
        perfTimer.reset();

        await withTimeout(
            rulesetResolver.load({
                report: (value: { message?: string; increment?: number }) => {
                    if (value.message) {
                        process.stdout.write(`  ${value.message}\r`);
                    }
                },
            }),
            LOAD_TIMEOUT_MS,
            `iteration ${i + 1}`,
        );

        const report = perfTimer.report();
        reports.push(report);

        const total = report['total.load']?.totalMs ?? 0;
        console.log(`  total.load = ${total.toFixed(2)} ms`);
    }

    // Compute averaged report
    const averaged: { [key: string]: { count: number; totalMs: number; avgMs: number; minMs: number; maxMs: number } } =
        {};
    const allKeys = new Set<string>();
    for (const r of reports) {
        for (const k of Object.keys(r)) {
            allKeys.add(k);
        }
    }

    for (const key of allKeys) {
        const values = reports.map((r) => r[key]?.totalMs ?? 0);
        const count = reports[0][key]?.count ?? 0;
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        averaged[key] = {
            count,
            totalMs: +avg.toFixed(2),
            avgMs: +(avg / Math.max(count, 1)).toFixed(4),
            minMs: +min.toFixed(2),
            maxMs: +max.toFixed(2),
        };
    }

    const result = {
        iterations,
        workspace: process.env.BENCHMARK_WORKSPACE || '(default)',
        timestamp: new Date().toISOString(),
        averaged,
        runs: reports,
    };

    // Write to project root
    const outDir = path.resolve(__dirname, '../../../benchmarks');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(outDir, `benchmark-headless-${timestamp}.json`);
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');

    console.log(`\n=== Averaged results (${iterations} runs) ===`);
    for (const key of Object.keys(averaged)) {
        const v = averaged[key];
        console.log(`  ${key}: avg=${v.totalMs}ms  min=${v.minMs}ms  max=${v.maxMs}ms  count=${v.count}`);
    }
    console.log(`\nResults written to: ${outPath}`);

    // Force exit — the VS Code extension host won't terminate on its own
    setTimeout(() => process.exit(0), 500);
}
