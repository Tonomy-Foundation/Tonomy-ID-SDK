export class HttpError extends Error {
    path: string;
    response: {
        headers: object;
        status: number;
        json?: object;
        html?: string;
        text?: string;
    };
    line?: number;
    column?: number;
    sourceURL?: string;

    constructor(httpError: any) {
        super('HTTP Error');
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        //  @see Node.js reference (bottom)
        Error.captureStackTrace(this, this.constructor);

        this.path = httpError.path;
        this.response = httpError.response;
        if (httpError.line) this.line = httpError.line;
        if (httpError.column) this.line = httpError.column;
        if (httpError.sourceURL) this.line = httpError.sourceURL;
    }
}

class SdkError extends Error {
    code: string;

    constructor(message: string) {
        super(message);
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        //  @see Node.js reference (bottom)
        // Error.captureStackTrace(this, this.constructor);
    }
}

// using never to suppress error https://bobbyhadz.com/blog/typescript-function-that-throws-error#:~:text=To%20declare%20a%20function%20that,terminate%20execution%20of%20the%20program.
export function throwError(message: string, code?: SdkErrors): never {
    const error = new SdkError(message);
    if (code) {
        error.code = code;
    }
    throw error;
}

enum SdkErrors {
    UsernameTaken = 'UsernameTaken',
    AccountDoesntExist = 'AccountDoesntExist',
    UsernameNotFound = 'UsernameNotFound',
    DataQueryNoRowDataFound = 'DataQueryNoRowDataFound',
    UpdateKeysTransactionNoKeys = 'UpdateKeysTransactionNoKeys',
    CouldntCreateApi = 'CouldntCreateApi',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace SdkErrors {
    /*
     * Returns the index of the enum value
     *
     * @param value The value to get the index of
     */
    export function indexFor(value: SdkErrors): number {
        return Object.keys(SdkErrors).indexOf(value);
    }

    /*
     * Creates an SdkErrors from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): SdkErrors {
        let index: number;
        if (typeof value !== 'number') {
            index = SdkErrors.indexFor(value as SdkErrors);
        } else {
            index = value;
        }
        return Object.values(SdkErrors)[index] as SdkErrors;
    }
}

export { SdkErrors };
