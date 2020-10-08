interface ILogger {
    log: any;
    error: any;
    on: any;
    off: any;
    verbose: any;
}
export declare const CreateLogger: import("Function/Curry").Curry<(logger: any, name: string, colorizer: any, type: string) => ILogger>;
export declare const ConsoleLogger: (console: any, name: string, color: any) => ILogger;
export {};
