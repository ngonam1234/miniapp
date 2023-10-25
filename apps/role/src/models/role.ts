import mongoose from "mongoose";
import { IRole, RoleType } from "../interfaces/models";

const requestPermissionSchema = new mongoose.Schema(
    {
        all: {
            type: Boolean,
            required: false,
            default: false,
        },
        view: {
            type: Boolean,
            required: false,
            default: false,
        },
        view_only_requester: {
            type: Boolean,
            required: false,
            default: false,
        },
        add: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit: {
            type: Boolean,
            required: false,
            default: false,
        },
        approve: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_priority: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_impact: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_urgency: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_due_date: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_due_date_SLA: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_requester: {
            type: Boolean,
            required: false,
            default: false,
        },
        change_status_to_resolved: {
            type: Boolean,
            required: false,
            default: false,
        },
        change_status_to_closed: {
            type: Boolean,
            required: false,
            default: false,
        },
        change_status_to_cancelled: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    {
        versionKey: false,
        _id: false,
    }
);

const incidentPermissionSchema = new mongoose.Schema(
    {
        all: {
            type: Boolean,
            required: false,
            default: false,
        },
        view: {
            type: Boolean,
            required: false,
            default: false,
        },
        add: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit: {
            type: Boolean,
            required: false,
            default: false,
        },
        approve: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_priority: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_impact: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_urgency: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_due_date: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_due_date_SLA: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit_requester: {
            type: Boolean,
            required: false,
            default: false,
        },
        change_status_to_resolved: {
            type: Boolean,
            required: false,
            default: false,
        },
        change_status_to_closed: {
            type: Boolean,
            required: false,
            default: false,
        },
        change_status_to_cancelled: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    {
        versionKey: false,
        _id: false,
    }
);

const solutionPermissionSchema = new mongoose.Schema(
    {
        all: {
            type: Boolean,
            required: false,
            default: false,
        },
        view: {
            type: Boolean,
            required: false,
            default: false,
        },
        add: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit: {
            type: Boolean,
            required: false,
            default: false,
        },
        approve: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    {
        versionKey: false,
        _id: false,
    }
);

const advancedViewPermissionSchema = new mongoose.Schema(
    {
        all_ticket: {
            type: Boolean,
            required: false,
            default: false,
        },
        group_ticket: {
            type: Boolean,
            required: false,
            default: false,
        },
        technician_ticket: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    {
        versionKey: false,
        _id: false,
    }
);

const taskPermissionSchema = new mongoose.Schema(
    {
        add: {
            type: Boolean,
            required: false,
            default: false,
        },
        edit: {
            type: Boolean,
            required: false,
            default: false,
        },
        approve: {
            type: Boolean,
            required: false,
            default: false,
        },
        delete: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    {
        versionKey: false,
        _id: false,
    }
);

const peopleSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        fullname: {
            type: String,
            required: false,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: false,
        },
        tenant: {
            type: String,
            required: false,
        },
        department: {
            type: String,
            required: false,
        },
        position: {
            type: String,
            required: false,
        },
    },
    {
        _id: false,
    }
);

const defaultObj = {
    all: false,
    view: false,
    view_only_requester: false,
    add: false,
    edit: false,
    approve: false,
    edit_priority: false,
    edit_impact: false,
    edit_urgency: false,
    edit_due_date: false,
    edit_due_date_SLA: false,
    edit_requester: false,
    change_status_to_resolved: false,
    change_status_to_closed: false,
    change_status_to_cancelled: false,
    all_ticket: false,
    group_ticket: false,
    technician_ticket: false,
};

const roleSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: false,
            enum: RoleType,
        },
        description: {
            type: String,
            required: false,
        },
        tenant: {
            type: String,
            required: false,
        },
        created_time: {
            type: Date,
            required: true,
        },
        updated_time: {
            type: Date,
            required: false,
        },
        created_by: {
            type: peopleSchema,
            required: true,
        },
        updated_by: {
            type: peopleSchema,
            required: false,
        },
        is_active: {
            type: Boolean,
            required: false,
            default: true,
        },
        is_deleted: {
            type: Boolean,
            required: false,
            default: false,
        },
        request_permission: {
            type: requestPermissionSchema,
            required: false,
            default: defaultObj,
        },
        incident_permission: {
            type: incidentPermissionSchema,
            required: false,
            default: defaultObj,
        },
        solution_permission: {
            type: solutionPermissionSchema,
            required: false,
            default: defaultObj,
        },
        advanced_view_permission: {
            type: advancedViewPermissionSchema,
            required: false,
            default: defaultObj,
        },
        task_permission: {
            type: taskPermissionSchema,
            required: false,
            default: defaultObj,
        },
    },
    {
        versionKey: false,
    }
);

const Role = mongoose.model<IRole>("Role", roleSchema);
export default Role;
