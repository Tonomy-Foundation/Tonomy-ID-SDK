import { io, Socket } from 'socket.io-client';
import { CommunicationError, createSdkError, SdkErrors } from '../../util/errors';
import { getSettings } from '../../util/settings';
import { AuthenticationMessage, Message } from '../../services/communication/message';

export type Subscriber = (message: Message) => void;

export class Communication {
    socketServer: Socket;
    private static object: Communication;
    private static identifier: 0;
    private subscribers = new Map<number, Subscriber>();
    private authMessage: AuthenticationMessage;

    constructor() {
        if (Communication.object) return Communication.object;
        const url = getSettings().communicationUrl;

        this.socketServer = io(url, {
            transports: ['websocket'],
            autoConnect: false,
        });

        Communication.object = this;
    }

    /**
     * Connects to the Tonomy Communication server
     *
     * @returns {Promise<void>}
     * @throws {SdkError} CommunicationNotConnected
     */
    private async connect(): Promise<void> {
        if (this.socketServer?.connected) return; // dont override socket if connected

        this.socketServer.connect();
        await new Promise((resolve, reject) => {
            this.socketServer.on('connect', async () => {
                if (this.authMessage) {
                    await this.login(this.authMessage);
                }

                resolve(true);
                return;
            });
            setTimeout(() => {
                if (this.socketServer.connected) return;

                reject(
                    createSdkError(
                        'Could not connect to Tonomy Communication server',
                        SdkErrors.CommunicationNotConnected
                    )
                );
            }, 5000);
        });
    }

    /**
     * Sends a Message object through a websocket connection to the Tonomy Communication server
     *
     * @param {string} event - the name of the event to emit
     * @param {Message} message - the Message object to send
     * @returns {Promise<boolean>} - true if successful and acknowledged by the server
     * @throws {SdkError} - CommunicationTimeout
     */
    private async emitMessage(event: string, message: Message): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            const resolved = false;

            this.socketServer.emit(event, { message: message.toString() }, (response: any) => {
                if (response.error) {
                    if (response.exception?.name === 'HttpException') {
                        const communicationError = new CommunicationError(response);

                        reject(communicationError);
                        return;
                    }

                    reject(response);
                    return;
                }

                resolve(response);
                return;
            });
            setTimeout(() => {
                if (resolved) return;
                reject(
                    createSdkError(
                        'Connection timed out to Tonomy Communication server',
                        SdkErrors.CommunicationTimeout
                    )
                );
            }, 5000);
        });
    }

    /**
     * connects to the Tonomy Communication server, authenticates with it's DID
     * @param {AuthenticationMessage} authorization - the VC the user sent
     *
     * @returns {boolean} - true if successful
     */
    async login(authorization: AuthenticationMessage): Promise<boolean> {
        await this.connect();

        const result = await this.emitMessage('login', authorization);

        if (result) this.authMessage = authorization;
        return result;
    }

    /* sends a message to another DID
     * create a Message object from the message argument
     * the message is used as the `vc` property of a VC signed by the User's key
     */
    async sendMessage(message: Message): Promise<boolean> {
        return await this.emitMessage('message', message);
    }

    /**
     * function that adds a new subscriber, which is called every time a message is received
     *
     * @param {Subscriber} subscriber - the message object
     * @param {string} [type] - shows itsan optional parameters
     * @returns {number} - identifier which will be used for unsubscribe
     */
    subscribeMessage(subscriber: Subscriber, type?: string): number {
        Communication.identifier++;

        const messageHandler = (message: any) => {
            const msg = new Message(message);

            if (!type || msg.getType() === type) {
                subscriber(msg);
            }

            return this;
        };

        this.socketServer.on('message', messageHandler);
        this.subscribers.set(Communication.identifier, messageHandler);
        return Communication.identifier;
    }

    /**
     * unsubscribes a function from the receiving a message
     *
     * @param {number} id - identifier which will be used for unsubscribe
     *
     */
    unsubscribeMessage(id: number): void {
        const subscriber = this.subscribers.get(id);

        if (subscriber) {
            this.socketServer.off('message', subscriber);
            this.subscribers.delete(id);
        }
    }

    disconnect() {
        if (this.socketServer?.connected) {
            this.socketServer.disconnect();
        }
    }
}
