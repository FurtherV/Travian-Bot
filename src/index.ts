#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Configuration } from "./Configuration";
import { BuildBot } from "./BuildBot";
import { Bot } from "./Bot";
import { Logger } from "./Logger";
import { RecruitBot } from "./RecruitBot";

async function main() {
    const logger = new Logger("[MAIN] ");

    const options = yargs(hideBin(process.argv))
        .options({
            config: {
                description: "Path to config file",
                type: "string",
                default: "./config.json",
            },
        })
        .help()
        .alias("help", "h")
        .parseSync();

    let config = Configuration.getConfigOrDefault(options.config);

    let bots: Bot[] = [];

    // Launch building bots
    for (const buildConfigKey of Object.keys(config.buildConfig)) {
        const villageId = parseInt(buildConfigKey);

        logger.info(`Starting Build Bot for village ${villageId}.`);
        const bot = new BuildBot(
            config.serverUrl,
            config.username,
            config.password,
            villageId,
            config.buildConfig[villageId]
        );

        bots.push(bot);
    }

    for (const recruitConfigKey of Object.keys(config.recruitConfig)) {
        const villageId = parseInt(recruitConfigKey);

        logger.info(`Starting Recruit Bot for village ${villageId}.`);
        const bot = new RecruitBot(
            config.serverUrl,
            config.username,
            config.password,
            villageId,
            config.recruitConfig[villageId]
        );

        bots.push(bot);
    }

    await Promise.all(bots.map((x) => x.start()));
}

main();
