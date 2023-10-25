export interface IWorkingHours {
    start_time: {
        hours: number;
        minutes: number;
    };
    end_time: {
        hours: number;
        minutes: number;
    };
    break_start_time?: {
        hours: number;
        minutes: number;
    };
    break_end_time?: {
        hours: number;
        minutes: number;
    };
}

export interface IWorkingDay {
    day: number;
    is_working: boolean;
    type?: "CUSTOM" | "STANDARD";
    working_hours?: IWorkingHours;
    exclude_weeks?: number[];
}

export interface IWorkingTime {
    id: string;
    tenant: string;
    type: EWorkingTimeType;
    standard_hours: IWorkingHours;
    working_days: IWorkingDay[];
    created_time: Date;
    updated_time?: Date;
    created_by: string;
    updated_by?: string;
}

export interface IHoliday {
    name: string;
    start: Date;
    end: Date;
}

export enum EWorkingTimeType {
    DEFAULT_8x5 = "8x5",
    DEFAULT_24x7 = "24x7",
    DEFAULT_24x5 = "24x5",
    CUSTOM = "CUSTOM",
}

export interface Pair<First, Second> {
    first: First;
    second: Second;
}
