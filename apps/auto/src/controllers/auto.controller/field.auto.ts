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
    getDepartments,
    getGroups,
    getImpacts,
    getMembersOfGroup,
    getPriorities,
    getServices,
    getSubCategories,
    getSubServices,
    getSubServicesL2,
    getTypes,
    getUrgencys,
} from "../../services";

interface CommonResponse {
    body?: { id: string; name: string }[] | undefined;
    status?: HttpStatus | undefined;
    path: string;
}

export async function getFieldData(params: {
    type: string;
    tenant: string;
    field: string;
    query?: string;
    group?: string;
}): Promise<Result> {
    const { tenant, field, type } = params;
    const arg = { tenant, is_active: true, type };
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
        case "group": {
            response = await getGroups(arg);
            break;
        }
        case "sub_services_L2": {
            response = await getSubServicesL2(arg);
            break;
        }
        case "department": {
            response = await getDepartments(arg);
            break;
        }
        case "impact": {
            if (params.type === "REQUEST") {
                throwUnsupportedFieldError(params.field);
            }
            response = await getImpacts(arg);
            break;
        }
        case "urgency": {
            if (params.type === "REQUEST") {
                throwUnsupportedFieldError(params.field);
            }
            response = await getUrgencys(arg);
            break;
        }
        case "technician": {
            response = await getMembersOfGroup({
                tenant: params.tenant,
                group: params.group as string,
            }).then((d) => {
                const body = d.body?.map(({ fullname, email, ...user }) => {
                    return { ...user, name: `${fullname} (${email})` };
                });
                return { ...d, body };
            });
            break;
        }
        default: {
            throw new HttpError(
                error.invalidData({
                    location: "query",
                    param: "field",
                    value: params.field,
                    message: "the field does not support",
                })
            );
        }
    }
    if (response.body) {
        const result = response.body.map((s) => ({
            id: s.id,
            name: s.name,
        }));
        return success.ok(result);
    } else {
        const err = error.service(response.path);
        throw new HttpError(err);
    }
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
export async function getPossibleData(params: {
    tenant: string;
    type: string;
}): Promise<Record<string, string[]>> {
    const { type } = params;
    const result: Record<string, string[]> = {};
    const fields = [
        "service",
        "sub_service",
        "category",
        "sub_category",
        "type",
        "priority",
        "group",
        "sub_services_L2",
        "department",
    ];
    if (type === "INCIDENT") {
        fields.push("impact", "urgency");
    }
    const promises = fields.map((f) =>
        getFieldData({
            tenant: params.tenant,
            field: f,
            type,
        })
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
