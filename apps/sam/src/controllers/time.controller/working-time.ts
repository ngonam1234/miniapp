import {
    IHoliday,
    IWorkingDay,
    IWorkingTime,
    Pair,
} from "../../interfaces/model";
import { setNextDay } from "./common";
import { removeHolidays } from "./holiday";
import { removeNonWorkingHours } from "./working-hours";

export function actualWorkingTime(
    time: Pair<Date, Date>,
    workingTime: IWorkingTime,
    holidays: IHoliday[],
    includeHoliday: boolean
): number {
    let times: Pair<Date, Date>[] = [];
    const workingDay = workingTime.working_days;
    if (includeHoliday) {
        times = removeNonWorkingTime(time, workingDay);
    } else {
        removeHolidays(time, holidays).forEach((t) => {
            const ts = removeNonWorkingTime(t, workingDay);
            times.push(...ts);
        });
    }
    let result = 0;
    times.forEach((t) => {
        result += t.second.getTime() - t.first.getTime();
    });
    return result;
}

export function removeNonWorkingTime(
    time: Pair<Date, Date>,
    workingDays: IWorkingDay[]
): Pair<Date, Date>[] {
    if (time.first.getTime() == time.second.getTime()) return [];
    const result: Pair<Date, Date>[] = [];
    const end = time.second;
    let start = time.first;

    while (start < end) {
        const startDay = start.getDay();

        for (let i = 0; i < workingDays.length; i++) {
            const workingDay = workingDays[i];
            if (startDay != workingDay.day) {
                continue;
            }

            const { exclude_weeks, is_working, working_hours } = workingDay;
            const dayTh = Math.floor(start.getDate() / 7);
            const ignore = exclude_weeks?.includes(dayTh) === false;
            if (!is_working || ignore || !working_hours) {
                setNextDay(start);
                continue;
            }
            const first = new Date(start);
            let second = new Date(start);
            setNextDay(second);

            if (second >= end) {
                start = new Date(end);
                second = new Date(end);
            } else {
                start = new Date(second);
                second.addMillisecond(-1);
            }

            const times = removeNonWorkingHours(
                { first, second },
                working_hours
            );
            result.push(...times);
        }
    }

    return result;
}
