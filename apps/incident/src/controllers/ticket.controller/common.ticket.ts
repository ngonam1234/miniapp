import { error, HttpError, HttpStatus } from "app";
import { IPeople, ITicket } from "../../interfaces/models";
import { getDownloadLinks, getUserByIds } from "../../service";

export async function getRequesterCreator(
    tenant: string,
    creatorId: string,
    requesterId?: string
): Promise<{ requester?: IPeople; creator: IPeople }> {
    const getRequesterError = (msg: string): HttpError => {
        return new HttpError(
            error.invalidData({
                location: "body",
                param: "requester",
                value: requesterId,
                message: msg,
            })
        );
    };
    const getCreatorError = (msg: string): HttpError => {
        return new HttpError(
            error.invalidData({
                location: "body",
                param: "creator",
                value: creatorId,
                message: msg,
            })
        );
    };
    const ids = requesterId ? [requesterId, creatorId] : [creatorId];
    const response = await getUserByIds(ids);
    const objectRequester = response?.body?.find((i) => i.id === requesterId);
    const objectCreator = response?.body?.find((i) => i.id === creatorId);
    if (requesterId) {
        if (!objectRequester) {
            throw getRequesterError("the requester does not exist");
        } else {
            if (objectRequester.tenant !== tenant) {
                throw getRequesterError(
                    `the requester does belong tenant ${tenant}`
                );
            }
            if (objectRequester.is_active === false) {
                throw getRequesterError("the requester is inactive");
            }
        }
    }
    if (!objectCreator) {
        throw getCreatorError("the requester does not exist");
    }
    return { creator: objectCreator, requester: objectRequester };
}

export function ticketHasDefaultField(
    name: string | keyof ITicket
): name is keyof ITicket {
    // prettier-ignore
    return [
        "status", "type", "group",
        "service", "channel", "sub_service", "category",
        "sub_category", "technician", "overdue_time",
        "urgency", "impact", "priority"
    ].includes(<string>name);
}

export async function getFileAttachments(
    attachments?: string[]
): Promise<{ name: string; link: string; object: string }[]> {
    let result: { name: string; link: string; object: string }[] = [];
    const objects = new Set(attachments);
    if (objects.size > 0) {
        const response = await getDownloadLinks([...objects]);
        if (response.status !== HttpStatus.OK || !response.body) {
            throw new HttpError(
                error.invalidData({
                    location: "body",
                    param: "attachments",
                    value: attachments,
                    message: "some attachments is not exist or valid",
                })
            );
        }
        result = response.body.map((v) => ({
            object: v.object,
            name: v.name,
            link: v.link,
        }));
    }
    return result;
}
