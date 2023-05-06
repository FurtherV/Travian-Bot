export abstract class Bot {
    constructor(
        protected serverUrl: string,
        protected username: string,
        protected password: string
    ) {}

    abstract start(): Promise<void>;
}
