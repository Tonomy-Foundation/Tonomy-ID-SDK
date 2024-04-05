// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function catchAndPrintErrors(fn: () => Promise<void>): () => Promise<void> {
    return () =>
        fn().catch((err) => {
            if (!err?.matcherResult) {
                // Not a Jest error
                console.error(JSON.stringify(err, null, 2));
            }
            throw err;
        });
}
