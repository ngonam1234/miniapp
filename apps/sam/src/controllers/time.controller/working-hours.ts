import { IWorkingHours, Pair } from "../../interfaces/model";
import { setHoursAndMinutes } from "./common";

export function removeNonWorkingHours(
    time: Pair<Date, Date>,
    workingHours: IWorkingHours
): Pair<Date, Date>[] {
    const { end_time, break_start_time } = workingHours;
    const { break_end_time, start_time } = workingHours;
    if (
        time.first.getHours() > end_time.hours ||
        (time.first.getHours() == end_time.hours &&
            time.first.getMinutes() >= end_time.minutes)
    ) {
        return [];
    }

    if (
        time.second.getHours() < start_time.hours ||
        (time.second.getHours() == start_time.hours &&
            time.second.getMinutes() < start_time.minutes)
    ) {
        return [];
    }

    if (
        time.first.getHours() < start_time.hours ||
        (time.first.getHours() == start_time.hours &&
            time.first.getMinutes() < start_time.minutes)
    ) {
        setHoursAndMinutes(time.first, start_time.hours, start_time.minutes);
    }

    if (
        time.second.getHours() > end_time.hours ||
        (time.second.getHours() == end_time.hours &&
            time.second.getMinutes() >= end_time.minutes)
    ) {
        setHoursAndMinutes(time.second, end_time.hours, end_time.minutes);
        time.second.addMillisecond(-1);
        time.second.addMinutes(1);
    }

    if (!break_end_time || !break_start_time) {
        const start = new Date(time.first);
        const end = new Date(time.second);
        return [{ first: start, second: end }];
    }

    const start1 = new Date(time.first);
    const end1 = new Date(time.second);
    const result: Pair<Date, Date>[] = [];

    if (
        time.second.getHours() > break_start_time.hours ||
        (time.second.getHours() == break_start_time.hours &&
            time.second.getMinutes() >= break_start_time.minutes)
    ) {
        setHoursAndMinutes(
            end1,
            break_start_time.hours,
            break_start_time.minutes
        );
        end1.addMillisecond(-1);
        if (start1 < end1) {
            result.push({ first: start1, second: end1 });
        }

        if (
            time.second.getHours() > break_end_time.hours ||
            (time.second.getHours() == break_end_time.hours &&
                time.second.getMinutes() >= break_end_time.minutes)
        ) {
            const start2 = new Date(time.first);
            if (
                time.first.getHours() < break_end_time.hours ||
                (time.first.getHours() == break_end_time.hours &&
                    time.first.getMinutes() <= break_end_time.minutes)
            ) {
                setHoursAndMinutes(
                    start2,
                    break_end_time.hours,
                    break_end_time.minutes
                );
                start2.addMinutes(1);
            }
            const end2 = new Date(time.second);
            result.push({ first: start2, second: end2 });
        }
        return result;
    } else {
        return [{ first: start1, second: end1 }];
    }
}
