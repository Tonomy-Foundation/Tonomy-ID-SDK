type did = string

type JWSProof = {
    typ: string
    alg: string
    iss: string
    exp: Date
}

type Proof = {
    type: did
    created: Date
    verificationMethod: string,
    proofPurpose: string,
    proofValue: JWSProof
}

interface VerifiableCredential<S> {
    "@context": string[]
    id: did
    issuer: did
    issuanceDate: Date
    subject: string
    type: string[]
    credentialSubject: S | S[]
    proof: Proof | Proof[]
}