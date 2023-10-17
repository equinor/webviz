import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
    snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
};

export default config;
