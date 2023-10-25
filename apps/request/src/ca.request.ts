import createApp from "app";
import { router } from "./routes";
import { configs } from "./configs";
import logger from "logger";
import {
    connectedToMongo,
    connectedToRedis,
    connectMongo,
    connectRedis,
} from "./database";
import { setEndpoint } from "action-mail";
import { Ticket } from "./models";

function main(): void {
    const app = createApp(router, configs);
    setEndpoint(configs.services.mail as string);
    const host = configs.app.host;
    const port = configs.app.port;

    const startApp = (): void => {
        app.listen(Number(port), host, () => {
            logger.info("Listening on: %s:%d", host, port);
        });
    };

    connectMongo(async () => {
        // if (connectedToRedis()) {
        //     startApp();
        // }
        const tickets = await Ticket.aggregate([
            {
                $match: {
                    number: { $regex: /^(?!REQ)/, $options: "i" },
                },
            },
            { $project: { _id: 1, id: 1, number: 1 } },
        ]);
        const res = await Ticket.bulkWrite(
            tickets.map((t) => ({
                updateOne: {
                    filter: { _id: t._id },
                    update: {
                        $set: {
                            number: `REQ${t.number}`,
                        },
                    },
                },
            }))
        );
        console.log(res);
    });
    // connectRedis(() => {
    //     if (connectedToMongo()) {
    //         startApp();
    //     }
    // });
}

main();
