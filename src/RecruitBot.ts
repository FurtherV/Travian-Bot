import { Bot } from "./Bot";
import { BrowserClient } from "./BrowserClient";
import { RecruitConfiguration } from "./Configuration";
import { Logger } from "./Logger";
import { sleep } from "./Utils";

export class RecruitBot extends Bot {
    private static readonly RECRUIT_BOT_LOGGER = new Logger("[RecruitBot] ");

    constructor(
        serverUrl: string,
        username: string,
        password: string,
        protected villageId: number,
        protected configurations: RecruitConfiguration[]
    ) {
        super(serverUrl, username, password);
    }

    async start(): Promise<void> {
        const logger = new Logger(
            `[${this.villageId}] `,
            RecruitBot.RECRUIT_BOT_LOGGER
        );
        const client = new BrowserClient();

        await client.initialize({
            headless: "new",
            userDataDir: `./tmp/bots/recruit/${this.villageId}`,
        });

        logger.info("Logging in...");
        await client.login(this.serverUrl, this.username, this.password);
        logger.info("Done.");

        for (const recruitConfig of this.configurations) {
            const currentTroops = await client.getTroops(this.villageId);
            logger.info(JSON.stringify(currentTroops, null, 4));
        }

        logger.info("Exiting...");
        await client.exit();
    }
}
