import { performance } from 'perf_hooks';
import { logger } from './logger';

interface TimingEntry {
    label: string;
    startTimes: number[];
    elapsed?: number;
    count: number;
    totalElapsed: number;
}

export class PerformanceTimer {
    private timings = new Map<string, TimingEntry>();
    private enabled = true;

    start(label: string): void {
        if (!this.enabled) {
            return;
        }

        let entry = this.timings.get(label);
        if (!entry) {
            entry = { label, startTimes: [], count: 0, totalElapsed: 0 };
            this.timings.set(label, entry);
        }

        entry.startTimes.push(performance.now());
    }

    stop(label: string): number {
        if (!this.enabled) {
            return 0;
        }

        const entry = this.timings.get(label);
        const startTime = entry?.startTimes.pop();
        if (!entry || startTime === undefined) {
            logger.warn(`PerformanceTimer: no start for label "${label}"`);
            return 0;
        }

        const elapsed = performance.now() - startTime;
        entry.elapsed = elapsed;
        entry.count++;
        entry.totalElapsed += elapsed;
        return elapsed;
    }

    report(): { [label: string]: { count: number; totalMs: number; avgMs: number; lastMs?: number } } {
        const result: { [label: string]: { count: number; totalMs: number; avgMs: number; lastMs?: number } } = {};

        for (const [label, entry] of this.timings) {
            result[label] = {
                count: entry.count,
                totalMs: Math.round(entry.totalElapsed * 100) / 100,
                avgMs: entry.count > 0 ? Math.round((entry.totalElapsed / entry.count) * 100) / 100 : 0,
                lastMs: entry.elapsed !== undefined ? Math.round(entry.elapsed * 100) / 100 : undefined,
            };
        }

        return result;
    }

    reset(): void {
        this.timings.clear();
    }

    logReport(): void {
        const report = this.report();
        logger.info('=== Performance Report ===');
        for (const [label, data] of Object.entries(report)) {
            if (data.count === 1) {
                logger.info(`  ${label}: ${data.totalMs}ms`);
            } else {
                logger.info(`  ${label}: ${data.totalMs}ms total (${data.count} calls, avg ${data.avgMs}ms)`);
            }
        }
        logger.info('=========================');
    }
}

export const perfTimer = new PerformanceTimer();
