import { io, Socket } from 'socket.io-client';
import { CommunicationError, createSdkError, SdkErrors, throwError } from '../../util/errors';
import { getSettings } from '../../util/settings';
import { AuthenticationMessage, Message } from '../../services/communication/message';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:services:communication:communication');

export type Subscriber = (message: Message) => void;

export const SOCKET_TIMEOUT = 5000;

export type WebsocketReturnType = {
    status: number;
    details?: any;
    error?: any;
};

export class Communication {
    socketServer: Socket;
    private static singleton: Communication;
    private static identifier: 0;
    // TODO fix problem: if server restarts, this will be lost and all clients will need to reconnect
    private subscribers = new Map<number, Subscriber>();
    private authMessage?: AuthenticationMessage;
    private loggedIn = false;
    private url: string;

    constructor(singleton = true) {
        if (Communication.singleton && singleton) return Communication.singleton;
        this.url = getSettings().communicationUrl;

        this.socketServer = io(this.url, {
            transports: ['websocket'],
            autoConnect: false,
        });

        Communication.singleton = this;
    }

    isConnected(): boolean {
        return this.socketServer && this.socketServer.connected;
    }

    isLoggedIn(): boolean {
        return this.loggedIn && this.authMessage !== undefined && typeof this.authMessage === 'object';
    }

    /**
     * Connects to the Tonomy Communication server
     *
     * @returns {Promise<void>}
     * @throws {SdkError} CommunicationNotConnected
     */
    private async connect(): Promise<void> {
        if (this.isConnected()) return;

        this.socketServer.connect();

        await new Promise((resolve, reject) => {
            this.socketServer.on('connect', async () => {
                if (this.isLoggedIn()) {
                    await this.login(this.authMessage as AuthenticationMessage);
                }

                resolve(true);
                return;
            });

            setTimeout(() => {
                if (this.isConnected()) return;

                reject(
                    createSdkError(
                        'Could not connect to Tonomy Communication server',
                        SdkErrors.CommunicationNotConnected
                    )
                );
            }, SOCKET_TIMEOUT);
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
        debug(
            'emitMessage',
            event,
            message.getType(),
            message.getSender(),
            message.getRecipient(),
            message.getPayload()
        );
        const ack = await new Promise<WebsocketReturnType>((resolve, reject) => {
            this.socketServer
                .timeout(SOCKET_TIMEOUT)
                .emit(event, { message: message.toString() }, (error: any, response: any) => {
                    debug('emitMessage response', JSON.stringify(error, null, 2), JSON.stringify(response, null, 2));

                    if (response?.error) {
                        if (response?.exception?.name === 'HttpException') {
                            const communicationError = new CommunicationError(response);

                            reject(communicationError);
                            return;
                        }

                        reject(response);
                        return;
                    }

                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(response);
                    return;
                });
        });

        if (ack.status !== 200) {
            throw new CommunicationError({
                exception: {
                    response: ack.error,
                    name: 'HttpException',
                    status: ack.status,
                    message: ack.error,
                },
                name: 'CommunicationError',
                message: ack.error,
            });
        }

        return ack.details;
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

        if (result) {
            this.loggedIn = true;
            this.authMessage = authorization;
        }

        return result;
    }

    /* sends a message to another DID
     * create a Message object from the message argument
     * the message is used as the `vc` property of a VC signed by the User's key
     */
    async sendMessage(message: Message): Promise<boolean> {
        if (!this.isLoggedIn()) {
            throwError('You need to login before sending a messages', SdkErrors.CommunicationNotLoggedIn);
        }

        return await this.emitMessage('message', message);
    }

    /**
     * function that adds a new subscriber, which is called every time a message is received
     *
     * @param {Subscriber} subscriber - the message object
     * @param {string} [type] - the type of message to subscribe to
     * @returns {number} - identifier which will be used for unsubscribe
     */
    subscribeMessage(subscriber: Subscriber, type?: string): number {
        Communication.identifier++;

        const messageHandler = (message: any) => {
            const msg = new Message(message);
            const payload = JSON.parse(msg.getPayload());

            debug('receiveMessage', msg.getType(), msg.getSender(), msg.getRecipient(), payload.requests?.length);

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
        this.loggedIn = false;
        delete this.authMessage;

        if (this.isConnected()) {
            this.socketServer.disconnect();
        }
    }
}
