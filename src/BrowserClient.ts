import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import Adblocker from "puppeteer-extra-plugin-adblocker";
import { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";

export interface UpgradeBuildingResult {
    success: boolean;
}

export interface BuildingData {
    buildingId: number;
    villageId: number;
    name: string;
    level: number;
    upgradable: boolean;
    underConstruction: boolean;
}

export interface BuildingQueueItem {
    name: string;
    level: number;
    duration: number;
}

export class BrowserClient {
    private browser: Browser | undefined;
    private page: Page | undefined;
    private serverUrl: string | undefined;

    constructor() {}

    public async initialize(options: PuppeteerLaunchOptions = {}) {
        puppeteer.use(StealthPlugin());
        puppeteer.use(Adblocker({ blockTrackers: true }));
        this.browser = await puppeteer.launch({
            headless: options.headless || false,
            defaultViewport: options.defaultViewport || null,
            userDataDir: options.userDataDir || "./tmp",
            protocolTimeout: 0,
        });

        this.page = await this.browser.newPage();
    }

    public async login(serverUrl: string, username: string, password: string) {
        this.serverUrl = serverUrl;

        await this.navigateTo(`${this.serverUrl}/logout`);

        await this.page?.type("input[name='name'].text", username);
        await this.page?.type("input[name='password'].text", password);
        await this.page?.click("button[type='submit'].textButtonV1.green");

        await this.page?.waitForNavigation();
    }

    public async exit() {
        await this.browser?.close();
    }

    public async logout() {
        await this.navigateTo(`${this.serverUrl}/dorf1.php`);
        await this.page?.click("li>a[href='/logout']");
        await this.page?.waitForNavigation();

        this.serverUrl = undefined;
    }

    public async switchToVillage(villageId: number) {
        //TODO: Add error checking.

        await this.navigateTo(
            `${this.serverUrl}/dorf1.php?newdid=${villageId}&`
        );
    }

    public async switchToBuilding(buildingId: number) {
        //TODO: Add error checking.

        await this.navigateTo(`${this.serverUrl}/build.php?id=${buildingId}`);
    }

    public async upgradeBuilding(
        villageId: number,
        buildingId: number
    ): Promise<UpgradeBuildingResult> {
        //TODO: Add error checking.

        await this.switchToVillage(villageId);
        await this.switchToBuilding(buildingId);

        let success;

        try {
            await this.page?.click(
                "button[type='button'].textButtonV1.green.build"
            );
            success = true;
        } catch (error) {
            success = false;
        }

        try {
            await this.page?.waitForNavigation({ timeout: 2000 });
        } catch (error) {}

        return {
            success: success,
        };
    }

    public async getBuildingQueue(
        villageId: number
    ): Promise<BuildingQueueItem[]> {
        //TODO: Add error checking.
        await this.switchToVillage(villageId);

        try {
            return (
                (await this.page?.$eval("div.buildingList>ul", (el) => {
                    const result: BuildingQueueItem[] = [];

                    const children = el.children;
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];

                        //TODO: Add error checking.
                        const divName = child.querySelector("div.name");
                        const timerBuildDuration = child.querySelector(
                            "div.buildDuration>span.timer"
                        );

                        const buildingTitle = divName?.textContent;
                        if (buildingTitle == null)
                            throw new Error(
                                `Could not find title of building in queue at ${villageId}.`
                            );

                        const buildingName =
                            this.getBuildingNameFromTitle(buildingTitle);
                        const buildingLevel =
                            this.getBuildingLevelFromTitle(buildingTitle);

                        const buildDuration = parseInt(
                            timerBuildDuration!.getAttribute("value") || ""
                        );

                        result.push({
                            name: buildingName,
                            level: buildingLevel,
                            duration: buildDuration,
                        });
                    }

                    return result;
                })) || []
            );
        } catch (error) {
            return [];
        }
    }

    public async getBuildingData(
        villageId: number,
        buildingId: number
    ): Promise<BuildingData> {
        await this.switchToVillage(villageId);
        await this.switchToBuilding(buildingId);

        const buildingTitle = await this.page?.$eval(
            "div.build>h1.titleInHeader",
            (el) => el.textContent
        );

        if (buildingTitle == null) {
            throw new Error(
                `Could not find title of building ${buildingId} at village ${villageId}.`
            );
        }

        const buildingName = this.getBuildingNameFromTitle(buildingTitle);
        const buildingLevel = this.getBuildingLevelFromTitle(buildingTitle);

        const upgradable = !!(await this.page?.$(
            "button[type='button'].textButtonV1.green.build"
        ));

        const underConstruction = !!(await this.page?.$(
            "div.upgradeHeader.levelSpecificInfo tr.underConstruction"
        ));

        return {
            buildingId: buildingId,
            villageId: villageId,
            name: buildingName,
            level: buildingLevel,
            upgradable: upgradable,
            underConstruction: underConstruction,
        };
    }

    private async navigateTo(url: string, maxRetries = 5) {
        let attempts = 0;
        while (attempts < maxRetries) {
            try {
                await this.page?.goto(url);
                break;
            } catch (error) {
                attempts++;
                if (attempts === maxRetries) {
                    throw new Error(`Could not navigate to URL ${url}`);
                }
            }
        }
    }

    private getBuildingNameFromTitle(buildingTitle: string): string {
        const parts = buildingTitle.split("Level");
        return parts[0].trim();
    }

    private getBuildingLevelFromTitle(buildingTitle: string): number {
        const parts = buildingTitle.split("Level");
        const buildingLevel = parseInt(parts[1].trim());
        return buildingLevel;
    }
}
