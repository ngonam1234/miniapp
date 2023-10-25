import createApp from "app";
import logger from "logger";
import "utils";
import { configs } from "./configs";
import { scheduleJobsIfNeeded } from "./controllers";
import { connectMongo } from "./database";
import { router } from "./routes";

function main(): void {
    const app = createApp(router, configs);
    const host = configs.app.host;
    const port = configs.app.port;

    const startApp = (): void => {
        app.listen(Number(port), host, () => {
            logger.info("Listening on: %s:%d", host, port);
        });
    };
    connectMongo(async () => {
        await scheduleJobsIfNeeded();
        startApp();
    });
}

main();
