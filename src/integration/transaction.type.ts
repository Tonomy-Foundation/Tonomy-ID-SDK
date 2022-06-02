type Action = {
    account: string
    name: string
    authorization: [{
        actor: string
        permission: string
    }],
    data: any
}

type SignTrxOptions = {
    blocksBehind: number,
    expireSeconds: number,
}

interface Transactions {
    signTrx(actions: Action[], options?: SignTrxOptions): Promise<any>
}