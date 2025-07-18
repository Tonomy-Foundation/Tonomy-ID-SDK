declare module '@wharfkit/antelope/src/api/v1/types' {
    export type AccountObject = import('@wharfkit/antelope').API.v1.AccountObject;
}
// Fixes and issue with `yarn run typeCheck` command where it would previously report a bunch of errors in the `@wharfkit/antelope` package.
// see https://chatgpt.com/codex/tasks/task_b_68370f57ab5c83338a2f39c7f9e32a38
