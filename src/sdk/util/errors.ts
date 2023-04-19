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

    constructor(httpError: HttpError) {
        super('HTTP Error');
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;

        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        //  @see Node.js reference (bottom)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        this.stack = new Error().stack;

        this.path = httpError.path;
        this.response = httpError.response;
        if (httpError.line) this.line = httpError.line;
        if (httpError.column) this.line = httpError.column;
        if (httpError.sourceURL) this.sourceURL = httpError.sourceURL;
    }
}

export class CommunicationError extends Error {
    exception: {
        response: string;
        name: string;
        status: number;
        message: string;
    };

    constructor(communicationError: CommunicationError) {
        super('Communication Error');
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;

        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        //  @see Node.js reference (bottom)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        this.stack = new Error().stack;

        this.exception = communicationError.exception;
    }
}

export class SdkError extends Error {
    code: SdkErrors;

    constructor(message: string) {
        super(message);
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;

        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        this.stack = new Error().stack;
    }
}

export function createSdkError(message: string, code?: SdkErrors): SdkError {
    let error = new SdkError(message);

    if (code) {
        error = new SdkError(code + ': ' + message);
        error.code = code;
    }

    return error;
}

// using never to suppress error https://bobbyhadz.com/blog/typescript-function-that-throws-error#:~:text=To%20declare%20a%20function%20that,terminate%20execution%20of%20the%20program.
export function throwError(message: string, code?: SdkErrors): never {
    throw createSdkError(message, code);
}

enum SdkErrors {
    AccountDoesntExist = 'AccountDoesntExist',
    AccountNotFound = 'AccountNotFound',
    CommunicationNotConnected = 'CommunicationNotConnected',
    CommunicationTimeout = 'CommunicationTimeout',
    CouldntCreateApi = 'CouldntCreateApi',
    DataQueryNoRowDataFound = 'DataQueryNoRowDataFound',
    InvalidData = 'InvalidData',
    InvalidKey = 'InvalidKey',
    InvalidKeyLevel = 'InvalidKeyLevel',
    JwtNotValid = 'JwtNotValid',
    KeyNotFound = 'KeyNotFound',
    MissingChallenge = 'MissingChallenge',
    MissingParams = 'MissingParams',
    OriginNotFound = 'OriginNotFound',
    OriginMismatch = 'OriginMismatch',
    PasswordFormatInvalid = 'PasswordFormatInvalid',
    PasswordInvalid = 'PasswordInvalid',
    PasswordTooCommon = 'PasswordTooCommon',
    PinInvalid = 'PinInvalid',
    SettingsNotInitialized = 'SettingsNotInitialized',
    UpdateKeysTransactionNoKeys = 'UpdateKeysTransactionNoKeys',
    UserDeactivated = 'UserDeactivated',
    UsernameNotFound = 'UsernameNotFound',
    UsernameTaken = 'UsernameTaken',
    UsernameNotDefined = 'UsernameNotDefined',
    UserNotLoggedIn = 'UserNotLoggedIn',
    WrongOrigin = 'WrongOrigin',
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
