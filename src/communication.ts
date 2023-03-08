import { io, Socket } from 'socket.io-client';
import { createSdkError, SdkErrors, throwError } from './services/errors';
import { getSettings } from './settings';
import { Message } from './util/message';

type Subscriber = (message: string) => void;

export class Communication {
    socketServer: Socket;

    /*
     * connects to the Tonomy Communication server
     *
     * @returns void
     * @throws SdkErrors.CommunicationNotConnected
     */
    private async connect(): Promise<void> {
        const url = getSettings().communicationUrl;

        this.socketServer = io(url, {
            transports: ['websocket'],
            retries: 5, // remove this when communication is staging ready
        });

        await new Promise((resolve, reject) => {
            this.socketServer.on('connect', () => {
                resolve(true);
            });
            setTimeout(() => {
                reject(
                    createSdkError(
                        'Could not connect to Tonomy Communication server',
                        SdkErrors.CommunicationNotConnected
                    )
                );
            }, 5000);
        });

        if (!this.socketServer.connected) {
            throwError('Could not connect to Tonomy Communication server', SdkErrors.CommunicationNotConnected);
        }
    }

    private async emitMessage(event: string, message: Message, timeout = 1000): Promise<boolean> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(createSdkError('Communication server timed out', SdkErrors.CommunicationTimeout));
            }, timeout);

            this.socketServer.emit(event, { message: message.jwt }, (response: any) => {
                if (response.err) {
                    reject(response.err);
                }

                resolve(response);
            });
        });
    }

    constructor() {}

    /* connects to the Tonomy Communication server, authenticates with it's DID
     * subscribes to any messages that are sent by `sendMessage` by providing a callback function executed every time a message is received
     * should send a read receipt when messages are received
     * @returns true if successful
     */
    async login(authorization: Message): Promise<boolean> {
        await this.connect();

        return await this.emitMessage('login', authorization);
    }

    /* sends a message to another DID
     * create a Message object from the message argument
     * the message is used as the `vc` property of a VC signed by the User's key
     */
    sendMessage(message: Message): Promise<boolean> {
        return this.emitMessage('message', message);
    }

    // function that adds a new subscriber, which is called every time a message is received
    subscribeMessage(subscriber: Subscriber): void {
        this.socketServer.on('message', subscriber);
    }

    // unsubscribes a function from the receiving a message
    unsubscribeMessage(subscriber: Subscriber) {
        this.socketServer.off('message', subscriber);
    }

    disconnect() {
        if (this.socketServer.connected) {
            this.socketServer.disconnect();
        }
    }
}
