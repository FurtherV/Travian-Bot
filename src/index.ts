#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { BrowserClient } from "./BrowserClient";
import fs from "fs";
import { Logger } from "./Logger";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BuildConfiguration {
    buildingIds: number[];
    targetLevel: number;
}

interface BotConfiguration {
    serverUrl: string;
    username: string;
    password: string;
    buildConfig: Record<string, BuildConfiguration[]>;
}

const DEFAULT_CONFIG: BotConfiguration = {
    serverUrl: "https://my-travian-server.com",
    username: "Test",
    password: "123456",
    buildConfig: {
        "123": [
            {
                buildingIds: [
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                    18,
                ],
                targetLevel: 5,
            },
        ],
        "456": [
            {
                buildingIds: [
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                    18,
                ],
                targetLevel: 5,
            },
        ],
    },
};

async function buildingLoop(
    serverUrl: string,
    username: string,
    password: string,
    villageId: number,
    buildingIds: number[],
    targetLevel: number
) {
    const logger = new Logger(`[${villageId}]`);
    const client = new BrowserClient();

    await client.initialize({
        headless: "new",
        userDataDir: `./tmp/${villageId}`,
    });

    logger.info("Logging in...");
    await client.login(serverUrl, username, password);
    logger.info("Done.");

    let remainingBuildingIds = [...buildingIds].sort((a, b) => a - b);

    // Remove building ids that have already reached or exceeded the target level
    logger.info("Removing already completed buildings from queue...");
    for (const buildingId of remainingBuildingIds) {
        const data = await client.getBuildingData(villageId, buildingId);
        if (data.level >= targetLevel) {
            remainingBuildingIds = remainingBuildingIds.filter(
                (x) => x !== buildingId
            );
        }
    }
    logger.info("Done");

    // Loop over all remaining building ids and build them in order.
    logger.info("Building loop started...");
    while (remainingBuildingIds.length > 0) {
        for (const buildingId of remainingBuildingIds) {
            // Check if the queue is full, if it is, wait until it is no longer full...
            let queueData = await client.getBuildingQueue(villageId);
            logger.info("queueData", queueData);

            while (queueData.length >= 2) {
                await sleep(
                    (Math.min(...queueData.map((x) => x.duration)) + 2) * 1000
                );
                queueData = await client.getBuildingQueue(villageId);
                logger.info("queueData", queueData);
            }

            // Get data of the current building id.
            let buildingData = await client.getBuildingData(
                villageId,
                buildingId
            );
            logger.info("buildingData", buildingData);

            // Check if the level is reached, if so, skip it and remove it from the remaining building ids
            if (buildingData.level >= targetLevel) {
                remainingBuildingIds = remainingBuildingIds.filter(
                    (x) => x !== buildingId
                );
                continue;
            }

            // Check if the building is upgradable. If it is not, wait until it is...
            while (!buildingData.upgradable) {
                await sleep(5000);
                buildingData = await client.getBuildingData(
                    villageId,
                    buildingId
                );
                logger.info("buildingData", buildingData);
            }

            // Upgrade the building and go to the next id.
            await client.upgradeBuilding(villageId, buildingId);

            // If this was the upgrade from level x to the target level,
            // we need to also remove it from the remaining building ids.
            if (buildingData.level + 1 >= targetLevel) {
                remainingBuildingIds = remainingBuildingIds.filter(
                    (x) => x !== buildingId
                );
            }
            await sleep(1000);
        }
        await sleep(5000);
    }

    logger.info(
        `All buildings with ids ${buildingIds} now have level >=${targetLevel}.`
    );
    logger.info("Exiting...");

    await client.exit();
}

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

    let config: BotConfiguration;

    try {
        const configFile = fs.readFileSync(options.config);
        config = JSON.parse(configFile.toString());
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error reading config file:", error.message);
        }
        console.log("Using default configuration...");
        config = DEFAULT_CONFIG;
        fs.writeFileSync(options.config, JSON.stringify(config, null, 4));
    }

    let bots: Promise<void>[] = [];
    for (const villageIdText of Object.keys(config.buildConfig)) {
        const currentBuildConfig = config.buildConfig[villageIdText];
        const villageId = parseInt(villageIdText);
        const buildingIds = currentBuildConfig[0].buildingIds;
        const targetLevel = currentBuildConfig[0].targetLevel;

        console.info(`Starting bot for village ${villageId}.`);
        const bot: Promise<void> = new Promise(async () => {
            await buildingLoop(
                config.serverUrl,
                config.username,
                config.password,
                villageId,
                buildingIds,
                targetLevel
            );
        });

        bots.push(bot);
        await Promise.any([sleep(5000), bot]);
    }
    await Promise.all(bots);
}

main();
