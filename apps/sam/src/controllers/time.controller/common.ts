export function setNextDay(time: Date): void {
    time.addDays(1);
    time.setHours(0);
    time.setMinutes(0);
    time.setSeconds(0);
    time.setMilliseconds(0);
}

export function setHoursAndMinutes(
    time: Date,
    hours: number,
    minutes: number
): void {
    time.setHours(hours);
    time.setMinutes(minutes);
    time.setSeconds(0);
    time.setMilliseconds(0);
}
