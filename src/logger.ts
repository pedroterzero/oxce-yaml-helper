export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3
}

//export let logLevel: LogLevel = workspace.getConfiguration('oxcYamlThingy').get('debugLevel');
export let logLevel: LogLevel = LogLevel.Debug;

export class Logger {
    public debug(...args: any[]): void {
        if (logLevel <= LogLevel.Debug) {
            console.info(...args);
        }
    }

    public info(...args: any[]): void {
        if (logLevel <= LogLevel.Info) {
            console.info(...args);
        }
    }

    public warn(...args: any[]): void {
        if (logLevel <= LogLevel.Warn) {
            console.warn(...args);
        }
    }

    public error(...args: any[]): void {
        if (logLevel <= LogLevel.Error) {
            console.error(...args);
        }
    }
}

export const logger = new Logger();
