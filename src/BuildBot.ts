import { Bot } from "./Bot";
import { BrowserClient } from "./BrowserClient";
import { BuildConfiguration } from "./Configuration";
import { Logger } from "./Logger";
import { sleep } from "./Utils";

export class BuildBot extends Bot {
    private static readonly BUILD_BOT_LOGGER = new Logger("[BuildBot] ");

    constructor(
        serverUrl: string,
        username: string,
        password: string,
        protected villageId: number,
        protected configurations: BuildConfiguration[]
    ) {
        super(serverUrl, username, password);
    }

    async start(): Promise<void> {
        const logger = new Logger(
            `[${this.villageId}] `,
            BuildBot.BUILD_BOT_LOGGER
        );
        const client = new BrowserClient();

        await client.initialize({
            headless: "new",
            userDataDir: `./tmp/bots/build/${this.villageId}`,
        });

        logger.info("Logging in...");
        await client.login(this.serverUrl, this.username, this.password);
        logger.info("Done.");

        for (const buildConfig of this.configurations) {
            const buildingIds = buildConfig.buildingIds;
            const targetLevel = buildConfig.targetLevel;

            logger.info(
                `Running following build config: ${buildingIds} >= ${targetLevel}.`
            );

            let remainingBuildingIds = [...buildingIds];

            // Remove building ids that have already reached or exceeded the target level
            logger.info("Removing already completed buildings from queue...");
            for (const buildingId of remainingBuildingIds) {
                const data = await client.getBuildingData(
                    this.villageId,
                    buildingId
                );
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
                for (const buildingId of [...remainingBuildingIds]) {
                    let buildingData = await client.getBuildingData(
                        this.villageId,
                        buildingId
                    );

                    if (buildingData.underConstruction) continue;

                    if (buildingData.level >= targetLevel) {
                        remainingBuildingIds = remainingBuildingIds.filter(
                            (x) => x !== buildingId
                        );
                        continue;
                    }

                    while (!buildingData.upgradable) {
                        await sleep(5000);
                        buildingData = await client.getBuildingData(
                            this.villageId,
                            buildingId
                        );
                    }

                    logger.info(`Upgrading building ${buildingData.name}.`);
                    const upgradeResult = await client.upgradeBuilding(
                        this.villageId,
                        buildingId
                    );

                    if (
                        upgradeResult.success &&
                        buildingData.level + 1 >= targetLevel
                    ) {
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
        }

        logger.info("Exiting...");
        await client.exit();
    }
}
