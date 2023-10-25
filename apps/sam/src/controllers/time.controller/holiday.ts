import { IHoliday, Pair } from "../../interfaces/model";

export function removeHolidays(
    time: Pair<Date, Date>,
    holidays: IHoliday[]
): Pair<Date, Date>[] {
    if (holidays.length === 0) {
        return [time];
    }
    const result: Pair<Date, Date>[] = [];
    const { start, end } = holidays[0];
    if (start <= time.first && time.second <= end) return [];
    if (time.second <= start || time.first >= end) {
        return removeHolidays(time, holidays.slice(1));
    }
    if (time.first < start && start <= time.second) {
        const second = new Date(start);
        const ms = second.getMilliseconds();
        second.setMilliseconds(ms - 1);
        const times = removeHolidays(
            { first: time.first, second },
            holidays.slice(1)
        );
        result.push(...times);
    }
    if (time.first <= end && end < time.second) {
        const first = new Date(end);
        const ms = first.getMilliseconds();
        first.setMilliseconds(ms + 1);
        const times = removeHolidays(
            { first, second: time.second },
            holidays.slice(1)
        );
        result.push(...times);
    }
    return result;
}
