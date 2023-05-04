export class Logger {
    public constructor(private prefix: string = "") {}

    public info(message?: any, ...optionalParams: any[]) {
        this.log("[INFO]", this.prefix, message, ...optionalParams);
    }

    public error(message?: any, ...optionalParams: any[]) {
        this.log("[ERROR]", this.prefix, message, ...optionalParams);
    }

    public warn(message?: any, ...optionalParams: any[]) {
        this.log("[WARN]", this.prefix, message, ...optionalParams);
    }

    public log(message?: any, ...optionalParams: any[]) {
        console.log(message, ...optionalParams);
    }
}
