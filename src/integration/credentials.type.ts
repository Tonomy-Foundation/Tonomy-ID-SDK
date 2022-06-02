type UnsignedVerifiableCredential<S> = Omit<VerifiableCredential<S>, "proof">

interface Credentials {
    sign(unsignedCredential: UnsignedVerifiableCredential<any>): Promise<VerifiableCredential<any>>
    share(credential: VerifiableCredential<any>, to: did): Promise<boolean>
    store(credential: VerifiableCredential<any>): Promise<boolean>
}