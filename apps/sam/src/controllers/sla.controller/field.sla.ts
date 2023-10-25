import {
    HttpError,
    HttpStatus,
    Result,
    ResultSuccess,
    error,
    success,
} from "app";
import {
    getCategories,
    getGroups,
    getImpacts,
    getMembersOfGroup,
    getPriorities,
    getServices,
    getSubCategories,
    getSubServices,
    getTypes,
    getUrgencys,
    getUser,
} from "../../services";

interface CommonResponse {
    body?: { id: string; name: string }[];
    status?: HttpStatus;
    path: string;
}

function throwUnsupportedFieldError(value: unknown): never {
    throw new HttpError(
        error.invalidData({
            location: "query",
            param: "field",
            value: value,
            message: "the field does not support",
        })
    );
}

export async function getFieldData(params: {
    module: string;
    tenant: string;
    field: string;
    query?: string;
    group?: string;
}): Promise<Result> {
    const { tenant, field, query, module } = params;
    const arg = { tenant, is_active: true, module };
    let response: CommonResponse;
    switch (field) {
        case "service": {
            response = await getServices(arg);
            break;
        }
        case "sub_service": {
            response = await getSubServices(arg);
            break;
        }
        case "category": {
            response = await getCategories(arg);
            break;
        }
        case "sub_category": {
            response = await getSubCategories(arg);
            break;
        }
        case "type": {
            response = await getTypes(arg);
            break;
        }
        case "priority": {
            response = await getPriorities(arg);
            break;
        }
        case "impact": {
            if (params.module === "REQUEST") {
                throwUnsupportedFieldError(params.field);
            }
            response = await getImpacts(arg);
            break;
        }
        case "urgency": {
            if (params.module === "REQUEST") {
                throwUnsupportedFieldError(params.field);
            }
            response = await getUrgencys(arg);
            break;
        }
        case "group": {
            response = await getGroups(arg);
            break;
        }
        case "technician": {
            response = await getMembersOfGroup({
                tenant: params.tenant,
                group: params.group as string,
            }).then((d) => {
                const body = d.body
                    ?.filter((t) => t.is_active)
                    .map(({ fullname, email, ...user }) => {
                        return { ...user, name: `${fullname} (${email})` };
                    });
                return { ...d, body };
            });
            break;
        }
        case "requester": {
            response = await getUser({
                tenant: params.tenant,
                is_active: true,
                query: query,
            }).then((d) => {
                const body = d.body?.map(({ fullname, email, ...user }) => {
                    return { ...user, name: `${fullname} (${email})` };
                });
                return { ...d, body };
            });
            break;
        }
        default: {
            throwUnsupportedFieldError(params.field);
        }
    }
    if (response.body) {
        const result = response.body.map(({ id, name }) => ({ id, name }));
        return success.ok(result);
    } else {
        const err = error.service(response.path);
        throw new HttpError(err);
    }
}

export async function getPossibleData(params: {
    tenant: string;
    module: string;
}): Promise<Record<string, string[]>> {
    const { tenant, module } = params;
    const result: Record<string, string[]> = {};
    const fields = [
        "service",
        "sub_service",
        "category",
        "sub_category",
        "type",
        "priority",
        "group",
        "requester",
    ];
    if (module === "INCIDENT") {
        fields.push("impact", "urgency");
    }
    const promises = fields.map((f) =>
        getFieldData({ tenant, field: f, module })
            .then((res) => res as ResultSuccess)
            .then((res) => res.data as { id: string }[])
            .then((res) => res.map((r) => r.id))
            .then((res) => ({ field: f, ids: res }))
    );

    const expects = await Promise.all(promises);
    for (const element of expects) {
        result[element.field] = element.ids;
    }
    return result;
}

export async function getMembersOfGroups(
    tenant: string,
    groups: string[]
): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    const promises = groups.map((v) =>
        getMembersOfGroup({ tenant, group: v })
            .then((res) => res.body)
            .then((res) => res?.map((i) => i.id))
            .then((res) => ({ group: v, members: res }))
    );
    const expects = await Promise.all(promises);
    for (const element of expects) {
        result[element.group] = element.members ?? [];
    }
    return result;
}
