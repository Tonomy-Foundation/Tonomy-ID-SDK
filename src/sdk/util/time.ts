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
 * @param {number} ms - Number of milliseconds to sleep
 */
export async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
