import { Result, success } from "app";
import Identity from "../models/identity";

export async function getIdentity(key: string): Promise<Result> {
    const identity = await Identity.findOneAndUpdate(
        { key },
        { $inc: { number: 1 } },
        { new: true }
    );
    if (!identity) {
        const now = new Date();
        const newIdentity = new Identity({
            key: key,
            number: 1,
            created_time: now,
        });
        newIdentity.save();
    }
    return success.ok({ number: identity?.number ?? 1 });
}
