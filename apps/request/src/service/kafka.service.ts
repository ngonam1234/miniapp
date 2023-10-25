import { CreateManyTicketReqBody } from "../interfaces/request";
import { Kafka } from "kafkajs";
import logger from "logger";

export async function ticketKafka(params: {
    tickets: CreateManyTicketReqBody[];
    topic: string;
    broker: string[];
    username: string;
    password: string;
}): Promise<void> {
    const dataValue = {
        data: params.tickets,
    };
    const kafka = new Kafka({
        brokers: params.broker as string[],
        ssl: false,
        sasl: {
            mechanism: "scram-sha-256", // scram-sha-256 or scram-sha-512
            username: params.username,
            password: params.password,
        },
    });
    const producer = kafka.producer();
    await producer.connect();
    logger.info("Connected to producer.");

    try {
        await producer.send({
            topic: params.topic,
            messages: [
                {
                    value: JSON.stringify(dataValue),
                },
            ],
        });
    } catch (error) {
        logger.info("error %o", error);
    }
}
