import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import Adblocker from "puppeteer-extra-plugin-adblocker";
import { Browser, Page } from "puppeteer";

export interface UpgradeBuildingResult {
    success: boolean;
}

export interface BuildingData {
    buildingId: number;
    villageId: number;
    name: string;
    level: number;
    upgradable: boolean;
}

export interface BuildingQueueItem {
    name: string;
    level: number;
    duration: number;
}

export interface BrowserClientOptions {
    headless?: boolean;
}

export class BrowserClient {
    private browser: Browser | undefined;
    private page: Page | undefined;
    private serverUrl: string | undefined;

    constructor() {}

    public async initialize(options: BrowserClientOptions = {}) {
        const { headless = false } = options;

        puppeteer.use(StealthPlugin());
        puppeteer.use(Adblocker({ blockTrackers: true }));
        this.browser = await puppeteer.launch({
            headless: headless,
            defaultViewport: null,
            userDataDir: "./tmp",
            protocolTimeout: 0,
        });

        this.page = await this.browser.newPage();
    }

    public async login(serverUrl: string, username: string, password: string) {
        this.serverUrl = serverUrl;

        await this.page?.goto(`${this.serverUrl}/logout`);

        await this.page?.type("input[name='name'].text", username);
        await this.page?.type("input[name='password'].text", password);
        await this.page?.click("button[type='submit'].textButtonV1.green");

        await this.page?.waitForNavigation();
    }

    public async exit() {
        await this.browser?.close();
    }

    public async logout() {
        await this.page?.goto(`${this.serverUrl}/dorf1.php`);
        await this.page?.click("li>a[href='/logout']");
        await this.page?.waitForNavigation();

        this.serverUrl = undefined;
    }

    public async switchToVillage(villageId: number) {
        //TODO: Add error checking.

        await this.page?.goto(
            `${this.serverUrl}/dorf1.php?newdid=${villageId}&`
        );
    }

    public async switchToBuilding(buildingId: number) {
        //TODO: Add error checking.

        await this.page?.goto(`${this.serverUrl}/build.php?id=${buildingId}`);
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

                        const buildingNameWithLevel =
                            divName!.textContent || "";
                        const parts = buildingNameWithLevel.split("Level");
                        const buildingName = parts[0].trim();
                        const buildingLevel = parseInt(parts[1].trim());

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

        //TODO: Add error checking.

        const buildingNameWithLevel = await this.page?.$eval(
            "div.build>h1.titleInHeader",
            (el) => el.textContent
        );

        const parts = buildingNameWithLevel!.split("Level");
        const buildingName = parts[0].trim();
        const buildingLevel = parseInt(parts[1].trim());

        const upgradable = !!(await this.page?.$(
            "button[type='button'].textButtonV1.green.build"
        ));

        return {
            buildingId: buildingId,
            villageId: villageId,
            name: buildingName,
            level: buildingLevel,
            upgradable: upgradable,
        };
    }
}
