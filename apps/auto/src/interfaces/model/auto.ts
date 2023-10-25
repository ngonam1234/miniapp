export interface IAuto {
    id: string;
    name: string;
    type: "REQUEST" | "INCIDENT";
    tenant: string;
    description?: string;
    is_active: boolean;
    is_delete: boolean;
    created_time: Date;
    updated_time?: Date;
    created_by: string;
    updated_by?: string;
    apply_request: string[];
    conditions: IAutoMatchingCondition[];
    auto_type: "ROUND_ROBIN" | "LOAD_BALANCING";
    apply_time: IApplyTime;
    group: IGroupInfo;
    apply_tech: IApplyTech;
    priority: number;
    is_apply: boolean;
}

export interface IAutoMatchingCondition {
    field: ITicketField; // infomation of ticket's field
    values: string[]; // list possible value for this field
}

export interface IInfoMember {
    id: string;
    fullname: string;
    email: string;
    phone: string;
    department: string;
    position: string;
    is_active: boolean;
    created_time: Date;
    updated_time: Date;
}
export interface IGroupInfo {
    id: string;
    name: string;
    description?: string;
    tenant: string;
    created_time: Date;
    is_active: boolean;
    leader: IInfoMember;
    members: IInfoMember[];
}

export interface IApplyTech {
    type: "ALL" | "EXCEPT" | "ONLINE" | "ONLY";
    techs?: IInfoMember[];
}
export enum ITypeAuto {
    ALL,
    EXCEPT,
    ONLINE,
    ONLY,
}

export interface ITicketField {
    name: string; // ex: group, techican
    display: string; // the display name of field
    location: string; // location of field's value

    // where get data when show combox
    datasource?: {
        href: string; // the api's url to get data
        dependencies: ITicketField[]; // ex: value of field techician depend on field group
    };
}

export interface IApplyTime {
    type: "ALL_TIME" | "IN_WORK" | "OUT_WORK";
    time?: "8x5" | "24x7" | "24x5";
}
