import fs from "fs";

export interface BuildConfiguration {
    buildingIds: number[];
    targetLevel: number;
}

export interface RecruitConfiguration {
    unitName: string;
    targetCount: number;
}

export interface AdventureConfiguration {
    minHealthPercentage: number;
}

export interface BotConfiguration {
    serverUrl: string;
    username: string;
    password: string;
    buildConfig: Record<string, BuildConfiguration[]>;
    recruitConfig: Record<string, RecruitConfiguration[]>;
    adventureConfig: AdventureConfiguration;
}

export class Configuration {
    static readonly DEFAULT_CONFIG: BotConfiguration = {
        serverUrl: "https://my-travian-server.com",
        username: "Test",
        password: "123456",
        buildConfig: {
            "123": [
                {
                    buildingIds: [
                        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
                        17, 18,
                    ],
                    targetLevel: 5,
                },
            ],
            "456": [
                {
                    buildingIds: [
                        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
                        17, 18,
                    ],
                    targetLevel: 5,
                },
            ],
        },
        recruitConfig: {
            "123": [
                {
                    unitName: "Praetorian",
                    targetCount: 5,
                },
            ],
        },
        adventureConfig: {
            minHealthPercentage: 50,
        },
    };

    static getConfigOrDefault(path: string): BotConfiguration {
        let config: BotConfiguration;
        try {
            const configFile = fs.readFileSync(path);
            const parsedConfig = JSON.parse(
                configFile.toString()
            ) as BotConfiguration;
            config = { ...this.DEFAULT_CONFIG, ...parsedConfig };
            // Update the config file with the merged configuration
            fs.writeFileSync(path, JSON.stringify(config, null, 4));
        } catch (error) {
            if (error instanceof Error) {
                console.error("Error reading config file:", error.message);
            }
            console.log("Using default configuration...");
            config = this.DEFAULT_CONFIG;
            fs.writeFileSync(path, JSON.stringify(config, null, 4));
        }
        return config;
    }
}
