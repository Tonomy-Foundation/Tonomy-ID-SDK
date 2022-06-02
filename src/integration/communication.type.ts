type SendResponse = {
    status: string
}

interface Communictaion {
    send(to: did, message: any): Promise<SendResponse>
}