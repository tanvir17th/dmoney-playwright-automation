import { defineConfig } from "@playwright/test";
import { env } from "./utils/env";

export default defineConfig({
    testDir: "./tests",
    // Each spec is a serial end-to-end journey that shares live accounts, so run one worker.
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 180_000,
    expect: { timeout: 15_000 },
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: env.baseUrl,
        viewport: { width: 1400, height: 900 },
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        trace: "retain-on-failure",
    },
    projects: [
        { name: "smoke", grep: /@smoke/ },
        { name: "regression", grep: /@regression/ },
    ],
});
