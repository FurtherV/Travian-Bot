export class Logger {
    public constructor(
        private prefix: string = "",
        private parentLogger?: Logger
    ) {}

    public info(message?: any, ...optionalParams: any[]) {
        this.log("[INFO]", message, ...optionalParams);
    }

    public error(message?: any, ...optionalParams: any[]) {
        this.log("[ERROR]", message, ...optionalParams);
    }

    public warn(message?: any, ...optionalParams: any[]) {
        this.log("[WARN]", message, ...optionalParams);
    }

    public log(message?: any, ...optionalParams: any[]) {
        const chainedPrefix = this.getChainedPrefix();
        console.log(chainedPrefix + message, ...optionalParams);
    }

    private getChainedPrefix(): string {
        if (this.parentLogger) {
            return this.parentLogger.getChainedPrefix() + this.prefix;
        }
        return this.prefix;
    }
}
