import { IHoliday, IWorkingTime } from "../../interfaces/model";
import { setHoursAndMinutes, setNextDay } from "./common";

export function calculateOverdueTime(
    workingTime: IWorkingTime,
    createdTime: Date,
    timeLimitInMs: number,
    holidays: IHoliday[],
    includeHoliday: boolean
): Date {
    const result = new Date(createdTime.getTime());

    const hInMs = 60 * 60 * 1000;
    const mInMs = 60 * 1000;
    const sInMs = 1000;

    while (timeLimitInMs > 0) {
        const day = result.getDay();
        for (const workingDay of workingTime.working_days) {
            if (!includeHoliday) {
                addHolidayTime(result, holidays);
            }
            if (day != workingDay.day) continue;
            const { exclude_weeks, is_working, working_hours } = workingDay;
            const dayTh = Math.floor(result.getDate() / 7);
            const ignore = exclude_weeks?.includes(dayTh) === false;
            if (ignore || !is_working || !working_hours) {
                setNextDay(result);
                continue;
            }
            const { end_time, break_start_time } = working_hours;
            const { break_end_time, start_time } = working_hours;
            if (
                result.getHours() < start_time.hours ||
                (result.getHours() == start_time.hours &&
                    result.getMinutes() < start_time.minutes)
            ) {
                setHoursAndMinutes(
                    result,
                    start_time.hours,
                    start_time.minutes
                );
            }

            if (
                (result.getHours() > start_time.hours ||
                    (result.getHours() == start_time.hours &&
                        result.getMinutes() >= start_time.minutes)) &&
                (result.getHours() < end_time.hours ||
                    (result.getHours() == end_time.hours &&
                        result.getMinutes() < end_time.minutes))
            ) {
                let duration = 0;
                if (break_start_time && break_end_time) {
                    if (
                        result.getHours() < break_start_time.hours ||
                        (result.getHours() == break_start_time.hours &&
                            result.getMinutes() < break_start_time.minutes)
                    ) {
                        duration =
                            (break_start_time.hours - result.getHours()) *
                                hInMs +
                            (break_start_time.minutes - result.getMinutes()) *
                                mInMs -
                            result.getSeconds() * sInMs +
                            result.getMilliseconds();
                        if (timeLimitInMs >= duration) {
                            result.addMillisecond(duration);
                            timeLimitInMs -= duration;
                        } else {
                            result.addMillisecond(timeLimitInMs);
                            timeLimitInMs -= timeLimitInMs;
                        }
                        if (timeLimitInMs === 0) continue;
                    }
                    if (
                        (result.getHours() > break_start_time.hours ||
                            (result.getHours() == break_start_time.hours &&
                                result.getMinutes() >=
                                    break_start_time.minutes)) &&
                        (result.getHours() < break_end_time.hours ||
                            (result.getHours() == break_end_time.hours &&
                                result.getMinutes() < break_end_time.minutes))
                    ) {
                        setHoursAndMinutes(
                            result,
                            break_end_time.hours,
                            break_end_time.minutes
                        );
                        result.addMinutes(1);
                    }
                    if (
                        result.getHours() > break_end_time.hours ||
                        (result.getHours() == break_end_time.hours &&
                            result.getMinutes() >= break_end_time.minutes)
                    ) {
                        duration =
                            (end_time.hours - result.getHours()) * hInMs +
                            (end_time.minutes - result.getMinutes()) * mInMs -
                            result.getSeconds() * sInMs +
                            result.getMilliseconds();
                        if (timeLimitInMs >= duration) {
                            result.addMillisecond(duration);
                            timeLimitInMs -= duration;
                        } else {
                            result.addMillisecond(timeLimitInMs);
                            timeLimitInMs -= timeLimitInMs;
                        }
                        if (timeLimitInMs === 0) continue;
                    }
                } else {
                    duration =
                        (end_time.hours - result.getHours()) * hInMs +
                        (end_time.minutes - result.getMinutes()) * mInMs -
                        result.getSeconds() * sInMs +
                        result.getMilliseconds();
                    if (timeLimitInMs >= duration) {
                        result.addMillisecond(duration);
                        timeLimitInMs -= duration;
                    } else {
                        result.addMillisecond(timeLimitInMs);
                        timeLimitInMs -= timeLimitInMs;
                    }
                    if (timeLimitInMs === 0) continue;
                }
            }

            const duration =
                (end_time.hours - result.getHours()) * hInMs +
                (end_time.minutes - result.getMinutes()) * mInMs -
                result.getSeconds() * sInMs +
                result.getMilliseconds();

            if (timeLimitInMs >= duration) {
                result.addMillisecond(duration);
                timeLimitInMs -= duration;
            } else {
                result.addMillisecond(timeLimitInMs);
                timeLimitInMs -= timeLimitInMs;
            }
            if (timeLimitInMs === 0) continue;

            if (
                result.getHours() > end_time.hours ||
                (result.getHours() == end_time.hours &&
                    result.getMinutes() >= end_time.minutes)
            ) {
                setNextDay(result);
            }
        }
    }
    return result;
}

function addHolidayTime(time: Date, holidays: IHoliday[]): void {
    for (const holiday of holidays) {
        if (holiday.start <= time && time <= holiday.end) {
            time.setTime(holiday.end.getTime() + 1);
        }
    }
}
