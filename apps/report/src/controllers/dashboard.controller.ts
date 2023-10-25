import { HttpStatus, Result, success } from "app";
import {
    getAllServiceWithSubServices,
    countTicketByStatus,
    findRoleByIds,
    countTicketByDate,
    countTicketByDepartment,
    countTicketByTechnician,
    getMyTicketsByStatus,
} from "../service";
import { SearchType, ServiceType } from "../interfaces/models";
import { RoleType } from "../interfaces/response";

export async function dashboardData(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    const { userTenant, userRoles, userId } = params;
    const [ticketData, serviceData] = await Promise.all([
        countTicketByStatus({ userTenant, userRoles, userId }),
        getAllServiceWithSubServices(userTenant),
    ]);
    const response = await findRoleByIds(userRoles, userTenant);
    const roles = response.body || [];
    const isEndUser =
        roles.some(
            (role) =>
                role.type === RoleType.CUSTOMER ||
                (role.type === RoleType.DEFAULT && role.id === "EU")
        ) &&
        !roles.some(
            (role) =>
                role.type === RoleType.EMPLOYEE ||
                (role.type === RoleType.DEFAULT && role.id !== "EU")
        );
    const services = serviceData.body?.filter(
        (s) =>
            s.is_active &&
            (isEndUser ? s.type === ServiceType.BUSINESS_SERVICE : true)
    );
    return success.ok({
        ticket_count: ticketData.body,
        services: { data: services },
    });
}

export async function searchByTypeAndName(params: {
    userTenant?: string;
    userRoles: string[];
    type: string;
    name: string;
}): Promise<Result> {
    const { userTenant, userRoles, type, name } = params;
    if (type.toUpperCase() === SearchType.SERVICE) {
        let isEndUser = false;
        if (userTenant) {
            const response = await findRoleByIds(userRoles, userTenant);
            if (response.status === HttpStatus.OK) {
                const roles = response.body;
                if (roles && roles.length > 0) {
                    isEndUser = roles.some((role) => {
                        if (
                            role.type === RoleType.CUSTOMER ||
                            (role.type === RoleType.DEFAULT && role.id === "EU")
                        ) {
                            return true;
                        }
                    });
                }
            }
        }
        const serviceData = await getAllServiceWithSubServices(
            userTenant,
            name
        );
        const services = serviceData.body?.filter((s) => {
            const isActive = s.is_active === true;
            const euCondition = isEndUser
                ? s.type === ServiceType.BUSINESS_SERVICE
                : true;
            return euCondition && isActive;
        });
        return success.ok({ services });
    } else {
        return success.ok({});
    }
}

export async function getMyTickets(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    const { userTenant, userRoles, userId } = params;
    const ticketData = await getMyTicketsByStatus({
        userTenant,
        userRoles,
        userId,
    });
    return success.ok(ticketData.body);
}

export async function getTotalTicketsByStatus(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
    startDate?: string;
    endDate?: string;
}): Promise<Result> {
    const { userTenant, userRoles, userId, startDate, endDate } = params;
    const ticketData = await countTicketByStatus({
        userTenant,
        userRoles,
        userId,
        startDate,
        endDate,
    });
    return success.ok(ticketData.body);
}

export async function getTotalTicketsByDate(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
    startDate?: string;
    endDate?: string;
}): Promise<Result> {
    const { userTenant, userRoles, userId, startDate, endDate } = params;
    const ticketData = await countTicketByDate({
        userTenant,
        userRoles,
        userId,
        startDate,
        endDate,
    });
    return success.ok(ticketData.body);
}

export async function getTicketCountByDepartment(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
    startDate?: string;
    endDate?: string;
    startDatePrew?: string;
    endDatePrew?: string;
}): Promise<Result> {
    const {
        userTenant,
        userRoles,
        userId,
        startDate,
        endDate,
        startDatePrew,
        endDatePrew,
    } = params;
    const ticketData = await countTicketByDepartment({
        userTenant,
        userRoles,
        userId,
        startDate,
        endDate,
        startDatePrew,
        endDatePrew,
    });
    return success.ok(ticketData.body);
}

export async function getTicketCountByTechnician(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
    startDate?: string;
    endDate?: string;

    startDatePrew?: string;
    endDatePrew?: string;
}): Promise<Result> {
    const {
        userTenant,
        userRoles,
        userId,
        startDate,
        endDate,
        startDatePrew,
        endDatePrew,
    } = params;
    const ticketData = await countTicketByTechnician({
        userTenant,
        userRoles,
        userId,
        startDate,
        endDate,
        startDatePrew,
        endDatePrew,
    });
    return success.ok(ticketData.body);
}
