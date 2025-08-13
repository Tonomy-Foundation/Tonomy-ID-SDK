export const MILLISECONDS_IN_SECOND = 1000;
export const MICROSECONDS_IN_SECOND = 1000000;
export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;
export const DAYS_IN_YEAR = 365.25;
export const SECONDS_IN_HOUR = MINUTES_IN_HOUR * SECONDS_IN_MINUTE;
export const SECONDS_IN_DAY = HOURS_IN_DAY * SECONDS_IN_HOUR;
export const SECONDS_IN_YEAR = DAYS_IN_YEAR * SECONDS_IN_DAY;
export const MICROSECONDS_IN_DAY = SECONDS_IN_DAY * MICROSECONDS_IN_SECOND;
export const MICROSECONDS_IN_MONTH = SECONDS_IN_DAY * 30 * MICROSECONDS_IN_SECOND;
export const MICROSECONDS_IN_YEAR = SECONDS_IN_YEAR * MICROSECONDS_IN_SECOND;

/**
 * Takes the number of seconds since epoch and returns a Date object
 *
 * @param {number} secs - Number of seconds since epoch
 * @returns {Date} - Date object
 */
export function toDateTime(secs: number): Date {
    const t = new Date(1970, 0, 1); // Epoch

    t.setSeconds(secs);
    return t;
}

/**
 * Sleeps for the given number of milliseconds
 *
 * @async
 * @param {number} milliseconds - Number of milliseconds to sleep
 */
export async function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Sleeps until the given date
 *
 * @async
 * @param {Date} date - Date to sleep until
 */
export async function sleepUntil(date: Date): Promise<void> {
    const now = new Date();

    if (date.getTime() <= now.getTime()) {
        return;
    }

    await sleep(date.getTime() - now.getTime());
}

/**
 * Adds a number of seconds and returns a new Date object
 *
 * @param {Date} date - Date object
 * @param {number} secs - Number of seconds to add
 */
export function addSeconds(date: Date, secs: number): Date {
    return new Date(date.getTime() + secs * 1000);
}

/**
 * Subtracts a number of seconds and returns a new Date object
 *
 * @param {Date} date - Date object
 * @param {number} secs - Number of seconds to subtract
 */
export function subtractSeconds(date: Date, secs: number): Date {
    return new Date(date.getTime() - secs * 1000);
}

/**
 * Adds a number of microseconds and returns a new Date object
 *
 * @param {Date} date - Date object
 * @param {number} microseconds - Number of microseconds to add
 */
export function addMicroseconds(date: Date, microseconds: number): Date {
    return new Date(date.getTime() + microseconds / 1000);
}

/**
 * Subtracts a number of microseconds and returns a new Date object
 *
 * @param {Date} date - Date object
 * @param {number} microseconds - Number of microseconds to subtract
 */
export function subtractMicroseconds(date: Date, microseconds: number): Date {
    return new Date(date.getTime() - microseconds / 1000);
}
