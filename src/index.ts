#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Configuration } from "./Configuration";
import { BuildBot } from "./BuildBot";
import { Bot } from "./Bot";

async function main() {
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
    for (const villageIdText of Object.keys(config.buildConfig)) {
        const villageId = parseInt(villageIdText);

        console.info(`Starting bot for village ${villageId}.`);
        const bot = new BuildBot(
            config.serverUrl,
            config.username,
            config.password,
            villageId,
            config.buildConfig[villageId]
        );

        bots.push(bot);
    }
    await Promise.all(bots.map((x) => x.start()));
}

main();
