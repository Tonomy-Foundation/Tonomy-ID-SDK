
type LoginOptions = {
    createKey?: boolean // Create a new key to use for smart contracts (on-chain) or authorizations (off-chain)
    onChainAuthorization?: boolean // True will add the public key of the created private key to the on-chain account to be used in smart contracts.
}

type LoginResponseCredentialSubject = {
    id: did
    jwk?: any // public key confirming the key that was created, if requested
    tx?: string // The transaction ID used to authorize the key on chain, if requested
}

type LogoutResponseCredentialSubject = {
    id: did
    tx?: string // The transaction ID used to deauthorize the key on chain, if requested
}

interface Identity {
    login(options?: LoginOptions): Promise<VerifiableCredential<LoginResponseCredentialSubject>>
    logout(): Promise<VerifiableCredential<LogoutResponseCredentialSubject>>
}