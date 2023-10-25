import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { FilterQuery, PipelineStage } from "mongoose";
import { error, HttpError, HttpStatus, Result, success } from "app";
import { Template, Workflow } from "../../models";
import {
    ILayoutItemDetail,
    ITemplate,
    ITemplateDetail,
    IWorkflowDetail,
} from "../../interfaces/models";
import { equal, parse } from "utils";
import { templateDetailPipeline } from "./common.template";
import { getPossibleChannels, getPossibleStatus } from "../common.controller";
import { workflowDetailPipeline } from "../workflow.controller";
import { FindReqQuery } from "../../interfaces/request";
import { findRoleByIds } from "../../service";
import { RoleType } from "../../interfaces/response";
import logger from "logger";

export async function findTemplate(params: FindReqQuery): Promise<Result> {
    let filter: FilterQuery<ITemplate> = {};
    let sort: Record<string, 1 | -1> = { created_time: -1 };
    if (params.tenant) {
        // const activeTemplate = await ActiveTemplate.findOne({
        //     code: params.tenant,
        //     is_active: true,
        // })?.lean();
        // const templateIds = activeTemplate?.template;
        // templateIds?.length > 0 && (filter.id = { $in: templateIds });
        filter.$or = [{ tenant: params.tenant }, { type: "DEFAULT" }];
    }

    try {
        if (params.query) {
            const uFilter = parseQuery(params.query);
            filter = { $and: [filter, uFilter] };
        }
        params.sort && (sort = parseSort(params.sort));
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        const errorValue =
            err.message === params.sort ? params.sort : params.query;
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: err.type,
                message: err.message,
                value: errorValue,
            })
        );
    }

    const project = {
        _id: 0,
        id: 1,
        name: 1,
        description: 1,
        tenant: 1,
        type: 1,
        is_active: 1,
    };

    const facet = {
        meta: [{ $count: "total" }],
        data: [
            { $skip: params.size * params.page },
            { $limit: params.size * 1 },
        ],
    };
    const pipeline: PipelineStage[] = [
        { $match: filter },
        { $sort: sort },
        { $project: project },
        { $facet: facet },
    ];
    const result = await Template.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.length > 0) ? 0 : res.total;
            return {
                page: Number(params.page),
                total: total,
                total_page: Math.ceil(total / params.size),
                data: res.data,
            };
        });
    return success.ok(result);
}

export async function getTemplateById(params: {
    templateId: string;
    tenant?: string;
}): Promise<Result> {
    const pipeline = templateDetailPipeline(params);
    const templates = await Template.aggregate(pipeline);

    if (templates.length != 0) {
        type typeOfTemplate = Omit<ITemplateDetail, "workflow"> & {
            workflow: string;
        };
        const template: typeOfTemplate = templates[0];
        const workflowPipeline = workflowDetailPipeline({
            workflowId: template.workflow,
            tenant: params.tenant,
        });
        const workflows: IWorkflowDetail[] = await Workflow.aggregate(
            workflowPipeline
        );
        const [enduser_layout, technician_layout] = await Promise.all([
            getLayout(
                template.enduser_layout,
                template.id,
                workflows[0],
                params.tenant
            ),
            getLayout(
                template.technician_layout,
                template.id,
                workflows[0],
                params.tenant
            ),
        ]);
        return success.ok({
            ...template,
            enduser_layout,
            technician_layout,
        });
    } else {
        return error.notFound({
            location: "params",
            param: "templateId",
            value: params.templateId,
            message: `the template does not exist`,
        });
    }
}

export async function getTemplateWithRoles(params: {
    templateId: string;
    tenant?: string;
    roles: string[];
}): Promise<Result> {
    const pipeline = templateDetailPipeline(params);
    const templates = await Template.aggregate(pipeline);
    if (templates.length != 0) {
        type typeOfTemplate = Omit<ITemplateDetail, "workflow"> & {
            workflow: string;
        };
        const template: typeOfTemplate = templates[0];
        const workflowPipeline = workflowDetailPipeline({
            workflowId: template.workflow,
            tenant: params.tenant,
        });
        const layoutItems = params.roles?.[equal](["EU"])
            ? template.enduser_layout
            : template.technician_layout;

        const workflows: IWorkflowDetail[] = await Workflow.aggregate(
            workflowPipeline
        );
        const newLayout = await getLayout(
            layoutItems,
            template.id,
            workflows[0],
            params.tenant
        );
        const result = {
            ...template,
            layout: newLayout,
            enduser_layout: undefined,
            technician_layout: undefined,
            has_enduser_layout: undefined,
        };
        return success.ok(result);
    } else {
        return error.notFound({
            param: "templateId",
            value: params.templateId,
            location: "param",
            message: `the template ${params.templateId} does not exist`,
        });
    }
}

async function getLayout(
    layout: ILayoutItemDetail[],
    templateId: string,
    workflow: IWorkflowDetail,
    tenant?: string
): Promise<
    (Omit<ILayoutItemDetail, "default"> & {
        default?: { value: string; display: string };
    })[]
> {
    type returnType = ReturnType<typeof getLayout>;
    const layoutPromise: Promise<Awaited<returnType>["0"]>[] = [];
    for (let i = 0; i < layout.length; i++) {
        const item = layout[i];
        if (item.field.datasource) {
            const href = item.field.datasource.href[parse]({
                resource: "templates",
                id: templateId,
            });
            item.field.datasource.href = href;
        }
        if (item.default) {
            switch (item.field.name) {
                case "channel": {
                    const itemPromise = getPossibleChannels(tenant).then(
                        (possibleChannel) => {
                            const d = <{ id: string; name: string }>(
                                possibleChannel.find(
                                    (st) => st.id === item.default
                                )
                            );
                            return {
                                ...item,
                                default: {
                                    value: d.id,
                                    display: d.name,
                                },
                            };
                        }
                    );
                    layoutPromise.push(itemPromise);
                    break;
                }
                case "status": {
                    const itemPromise = getPossibleStatus(workflow).then(
                        (possibleStatus) => {
                            const d = <{ id: string; name: string }>(
                                possibleStatus.find(
                                    (st) => st.id === item.default
                                )
                            );
                            return {
                                ...item,
                                default: {
                                    value: d.id,
                                    display: d.name,
                                },
                            };
                        }
                    );
                    layoutPromise.push(itemPromise);
                    break;
                }
                default: {
                    break;
                }
            }
        } else {
            layoutPromise.push(
                new Promise((resolve) => {
                    resolve({ ...item, default: undefined });
                })
            );
        }
    }
    return await Promise.all(layoutPromise);
}
