export function toDateTime(secs: number) {
    const t = new Date(1970, 0, 1); // Epoch

    t.setSeconds(secs);
    return t;
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
