export declare class HttpError extends Error {
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
    constructor(httpError: HttpError);
}
export declare class SdkError extends Error {
    code: SdkErrors;
    constructor(message: string);
}
export declare function createSdkError(message: string, code?: SdkErrors): SdkError;
export declare function throwError(message: string, code?: SdkErrors): never;
declare enum SdkErrors {
    UsernameTaken = "UsernameTaken",
    AccountDoesntExist = "AccountDoesntExist",
    UsernameNotFound = "UsernameNotFound",
    DataQueryNoRowDataFound = "DataQueryNoRowDataFound",
    UpdateKeysTransactionNoKeys = "UpdateKeysTransactionNoKeys",
    CouldntCreateApi = "CouldntCreateApi",
    PasswordFormatInvalid = "PasswordFormatInvalid",
    PasswordTooCommon = "PasswordTooCommon",
    PasswordInValid = "PasswordInValid",
    KeyNotFound = "KeyNotFound",
    OriginNotFound = "OriginNotFound",
    JwtNotValid = "JwtNotValid",
    WrongOrigin = "WrongOrigin",
    SettingsNotInitialized = "SettingsNotInitialized",
    MissingParams = "MissingParams",
    InvalidKey = "InvalidKey",
    invalidDataType = "invalidDataType",
    missingChallenge = "missingChallenge",
    CommunicationNotConnected = "CommunicationNotConnected",
    CommunicationTimeout = "CommunicationTimeout",
    OriginMismatch = "OriginMismatch",
    PinInValid = "PinInValid",
    AccountNotFound = "AccountNotFound",
    UserNotLoggedIn = "UserNotLoggedIn"
}
declare namespace SdkErrors {
    function indexFor(value: SdkErrors): number;
    function from(value: number | string): SdkErrors;
}
export { SdkErrors };
