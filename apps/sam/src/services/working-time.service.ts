import {
    EWorkingTimeType,
    IHoliday,
    IWorkingDay,
    IWorkingHours,
    IWorkingTime,
} from "../interfaces/model";

const workingHours8h: IWorkingHours = {
    start_time: {
        hours: 8,
        minutes: 30,
    },
    end_time: {
        hours: 17,
        minutes: 29,
    },
    break_start_time: {
        hours: 11,
        minutes: 0,
    },
    break_end_time: {
        hours: 11,
        minutes: 59,
    },
};

const workingHours24h: IWorkingHours = {
    start_time: {
        hours: 0,
        minutes: 0,
    },
    end_time: {
        hours: 23,
        minutes: 59,
    },
};
const holidays: IHoliday[] = [];

const workingDay8x5: IWorkingDay[] = [
    {
        day: 0,
        is_working: false,
    },
    {
        day: 1,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours8h,
    },
    {
        day: 2,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours8h,
    },
    {
        day: 3,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours8h,
    },
    {
        day: 4,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours8h,
    },
    {
        day: 5,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours8h,
    },
    {
        day: 6,
        is_working: false,
    },
];

const workingDay24x7: IWorkingDay[] = [
    {
        day: 0,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 1,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 2,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 3,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 4,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 5,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 6,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
];

const workingDay24x5: IWorkingDay[] = [
    {
        day: 0,
        is_working: false,
    },
    {
        day: 1,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 2,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 3,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 4,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 5,
        is_working: true,
        type: "STANDARD",
        working_hours: workingHours24h,
    },
    {
        day: 6,
        is_working: false,
    },
];

export function getWorkingTime(code: "8x5" | "24x7" | "24x5"): IWorkingTime {
    switch (code) {
        case "8x5": {
            return {
                id: "e8db4122-4700-11ee-be56-0242ac120002",
                tenant: "FIS.DT.DAP",
                type: EWorkingTimeType.DEFAULT_8x5,
                standard_hours: workingHours8h,
                working_days: workingDay8x5,
                created_time: new Date(),
                created_by: "hungvm24../fpt.com",
            };
        }
        case "24x5": {
            return {
                id: "e8db4122-4700-11ee-be56-0242ac120003",
                tenant: "FIS.DT.DAP",
                type: EWorkingTimeType.DEFAULT_24x5,
                standard_hours: workingHours24h,
                working_days: workingDay24x5,
                created_time: new Date(),
                created_by: "hungvm24../fpt.com",
            };
        }
        case "24x7": {
            return {
                id: "e8db4122-4700-11ee-be56-0242ac120004",
                tenant: "FIS.DT.DAP",
                type: EWorkingTimeType.DEFAULT_24x7,
                standard_hours: workingHours24h,
                working_days: workingDay24x7,
                created_time: new Date(),
                created_by: "hungvm24../fpt.com",
            };
        }
        default: {
            throw new Error(`unsupport working hour ${code}`);
        }
    }
}

export function getHolidays(): IHoliday[] {
    return holidays;
}
