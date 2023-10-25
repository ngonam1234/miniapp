declare global {
    interface Date {
        addDays: typeof addDaysImpl;
        addMinutes: typeof addMinutesImpl;
        addSeconds: typeof addSecondsImpl;
        addMillisecond: typeof addMillisecondImpl;
    }
}

const addDaysImpl = function (this: Date, days: number): void {
    this.setDate(this.getDate() + days);
};

const addMinutesImpl = function (this: Date, minutes: number) {
    this.setMinutes(this.getMinutes() + minutes);
};

const addSecondsImpl = function (this: Date, seconds: number): void {
    this.setSeconds(this.getSeconds() + seconds);
};

const addMillisecondImpl = function (this: Date, milliSeconds: number) {
    this.setMilliseconds(this.getMilliseconds() + milliSeconds);
};

Date.prototype.addDays = addDaysImpl;
Date.prototype.addMinutes = addMinutesImpl;
Date.prototype.addSeconds = addSecondsImpl;
Date.prototype.addMillisecond = addMillisecondImpl;

export {};
