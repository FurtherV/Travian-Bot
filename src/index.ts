import { BrowserClient } from "./BrowserClient";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const client = new BrowserClient();

    await client.initialize({
        headless: true,
    });

    await client.login(
        "https://gos.x5.international.travian.com",
        "FurtherV",
        "X#Eqn.7vhBsv57F"
    );

    const villageId = 26564;
    const buildingIds = [26, 20, 21];
    const targetLevel = 20;

    let remainingBuildingIds = [...buildingIds].sort((a, b) => a - b);

    // Remove building ids that have already reached or exceeded the target level
    console.info("Removing already completed buildings from queue...");
    for (const buildingId of remainingBuildingIds) {
        const data = await client.getBuildingData(villageId, buildingId);
        if (data.level >= targetLevel) {
            remainingBuildingIds = remainingBuildingIds.filter(
                (x) => x !== buildingId
            );
        }
    }
    console.info("Done");

    // Loop over all remaining building ids and build them in order.
    console.info("Building loop started...");
    while (remainingBuildingIds.length > 0) {
        for (const buildingId of remainingBuildingIds) {
            // Check if the queue is full, if it is, wait until it is no longer full...
            let queueData = await client.getBuildingQueue(villageId);
            console.info("queueData", queueData);

            while (queueData.length >= 2) {
                await sleep(
                    (Math.min(...queueData.map((x) => x.duration)) + 2) * 1000
                );
                queueData = await client.getBuildingQueue(villageId);
                console.info("queueData", queueData);
            }

            // Get data of the current building id.
            let buildingData = await client.getBuildingData(
                villageId,
                buildingId
            );
            console.info("buildingData", buildingData);

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
                console.info("buildingData", buildingData);
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

    console.info(
        `All buildings with ids ${buildingIds} now have level >=${targetLevel}.`
    );
    console.info("Exiting...");

    await client.exit();
}
-main();
