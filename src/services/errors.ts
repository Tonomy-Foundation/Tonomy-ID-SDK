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
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ExpectedSdkError extends SdkError {
    constructor(message: string) {
        super(message);
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        //  @see Node.js reference (bottom)
        Error.captureStackTrace(this, this.constructor);
    }
}

export class UnexpectedSdkError extends SdkError {
    constructor(message: string) {
        super(message);
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        //  @see Node.js reference (bottom)
        Error.captureStackTrace(this, this.constructor);
    }
}

export function throwExpectedError(message: string, code?: string) {
    const error = new ExpectedSdkError(message);
    if (code) {
        error.code = code;
    }
    throw error;
}

export function throwUnexpectedError(message: string, code?: string) {
    const error = new UnexpectedSdkError(message);
    if (code) {
        error.code = code;
    }
    throw error;
}

/*
List of which files have which error codes, to avoide duplicates:export function throwExpectedError(message: string, code: string) {

TSDK10## = users.ts
TSDK11## = IDContracts.ts
*/
