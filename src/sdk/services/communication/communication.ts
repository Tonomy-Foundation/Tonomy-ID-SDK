import { io, Socket } from 'socket.io-client';
import { CommunicationError, createSdkError, SdkErrors, throwError } from '../../util/errors';
import { getSettings } from '../../util/settings';
import { AuthenticationMessage, Message, VerificationMessage } from '../../services/communication/message';
import Debug from 'debug';
import { IdentityVerificationStorage } from '../../storage/entities/identityVerificationStorage';

const debug = Debug('tonomy-sdk:services:communication:communication');

export type Subscriber = (message: Message) => void;
export type VeriffSubscriber = (message: VerificationMessage) => Promise<IdentityVerificationStorage | null>;

export const SOCKET_TIMEOUT = 5000;
export const SESSION_TIMEOUT = 40000;

export type WebsocketReturnType = {
    status: number;
    details?: any;
    error?: any;
};

export class Communication {
    socketServer: Socket;
    private static singleton: Communication;
    private static identifier: 0;
    // TODO: fix problem: if server restarts, this will be lost and all clients will need to reconnect
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

        const result = await this.emitMessage('v1/login', authorization);

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

        return await this.emitMessage('v1/message/relay', message);
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
            const payload = msg.getPayload();

            debug('receiveMessage', msg.getType(), msg.getSender(), msg.getRecipient(), payload.requests?.length);

            if (!type || msg.getType() === type) {
                subscriber(msg);
            }

            return this;
        };

        this.socketServer.on('v1/message/relay', messageHandler);
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
            this.socketServer.off('v1/message/relay', subscriber);
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

    /**
     * Subscribes to the first Veriff verification message.
     * Resolves with the message, or rejects on timeout.
     *
     * @param {VeriffSubscriber} handler - Callback invoked with the message.
     * @returns {Promise<IdentityVerificationStorage>}
     */
    subscribeToVeriffVerification(handler: VeriffSubscriber): Promise<IdentityVerificationStorage> {
        return new Promise((resolve, reject) => {
            const id = Communication.identifier++;

            const wrapper = async (message: Message) => {
                try {
                    this.subscribers.delete(id);
                    this.socketServer.off('/v1/verification/veriff/receive', wrapper);
                    clearTimeout(timeout);

                    const result = await handler(message as VerificationMessage);

                    if (result) {
                        resolve(result);
                    } else {
                        reject(createSdkError('Verification message was handled but returned no data'));
                    }
                } catch (error) {
                    reject(error);
                }
            };

            this.subscribers.set(id, wrapper);
            this.socketServer.on('/v1/verification/veriff/receive', wrapper);

            const timeout = setTimeout(() => {
                this.subscribers.delete(id);
                this.socketServer.off('/v1/verification/veriff/receive', wrapper);
                reject(
                    createSdkError('Timed out waiting for session data from server', SdkErrors.CommunicationTimeout)
                );
            }, SESSION_TIMEOUT);
        });
    }
}
