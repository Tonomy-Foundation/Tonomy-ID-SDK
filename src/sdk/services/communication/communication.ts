import { io, Socket } from 'socket.io-client';
import { CommunicationError, createSdkError, SdkErrors, throwError } from '../../util/errors';
import { getSettings } from '../../util/settings';
import {
    AuthenticationMessage,
    Message,
    SwapTokenMessage,
    VerificationMessage,
} from '../../services/communication/message';
import Debug from 'debug';
import { sha256 } from '../../util/crypto';

const debug = Debug('tonomy-sdk:services:communication:communication');

export type Subscriber = (message: Message) => void;
export type VeriffSubscriber = (message: VerificationMessage) => Promise<void>;
export type SwapSubscriber = (memo: string) => Promise<void>;

export const SOCKET_TIMEOUT = 100000;
export const SESSION_TIMEOUT = 40000;

export type WebsocketReturnType = {
    status: number;
    details?: any;
    error?: any;
};

export class Communication {
    socketServer: Socket;
    private static singleton: Communication;
    private static identifier: number = 0;
    // TODO: fix problem: if server restarts, this will be lost and all clients will need to reconnect
    private subscribers = new Map<number, Subscriber>();
    private authMessage?: AuthenticationMessage;
    private loggedIn = false;
    private url: string;
    private seenMessages: Map<string, Date> = new Map(); // Map<hash, Date>
    private readonly seemMessageTTL = 60 * 60; // 1 hour

    /**
     * Checks if a message has been seen before
     * Run duplicate check only in CI or local test environment; skip elsewhere (e.g. production)
     *
     * @description Fixes an issue where subscriber were triggered twice
     * @link https://chatgpt.com/share/e/6866b6e9-96a4-8013-b25d-381a3518567e
     * TODO: figure out the root cause and solve
     *
     * @param {string} message - the message to check
     * @returns {boolean} true if the message has been seen before
     */
    private checkSeenMessage(message: string): boolean {
        if (typeof process !== 'undefined' && !process.env.CI && process.env.NODE_ENV !== 'test') return false;
        const res = this.seenMessages.has(sha256(message));

        this.addSeenMessage(message);
        this.trimSeenMessages();
        return res;
    }
    private trimSeenMessages(): void {
        this.seenMessages.forEach((date, hash) => {
            if (date.getTime() + this.seemMessageTTL < Date.now()) {
                this.seenMessages.delete(hash);
            }
        });
    }
    private addSeenMessage(message: string): void {
        this.seenMessages.set(sha256(message), new Date());
    }

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

        return await this.emitMessage('v1/message/relay/send', message);
    }

    async sendSwapMessage(message: SwapTokenMessage): Promise<boolean> {
        if (!this.isLoggedIn()) {
            throwError('You need to login before sending a messages', SdkErrors.CommunicationNotLoggedIn);
        }

        return await this.emitMessage('v2/swap/token/tono', message);
    }

    /**
     * function that adds a new subscriber, which is called every time a message is received
     *
     * @param {Subscriber} subscriber - the message object
     * @param {string} type - the type of message to subscribe to
     * @returns {number} - identifier which will be used for unsubscribe
     */
    subscribeMessage(subscriber: Subscriber, type: string): number {
        Communication.identifier++;

        const messageHandler = (message: any) => {
            const msg = new Message(message);

            if (this.checkSeenMessage(msg.toString())) {
                debug('receiveMessage duplicate', msg.getType(), msg.getSender(), msg.getRecipient());
                return;
            }

            debug('receiveMessage', msg.getType(), msg.getSender(), msg.getRecipient());

            if (msg.getType() === type) {
                subscriber(msg);
            }

            return this;
        };

        this.socketServer.on('v1/message/relay/receive', messageHandler);
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
            this.socketServer.off('v1/message/relay/receive', subscriber);
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
     * Subscribes to Veriff verification messages.
     * Calls the handler every time a verification message is received.
     *
     * @param {VeriffSubscriber} handler - Callback invoked with the message.
     * @returns {number} - Identifier for unsubscribing.
     */
    subscribeVeriffVerification(subscriber: VeriffSubscriber): number {
        Communication.identifier++;
        debug('subscribeVeriffVerification() called');

        const messageHandler = async (message: any) => {
            debug('message', message);
            const msg = new VerificationMessage(message);

            if (this.checkSeenMessage(msg.toString())) {
                debug('receiveVeriffVerification duplicate', msg.getType(), msg.getSender(), msg.getRecipient());
                return;
            }

            debug('receiveVeriffVerification', msg.getType(), msg.getSender(), msg.getRecipient());

            if (msg.getType() === VerificationMessage.getType()) {
                await subscriber(msg);
            }

            return this;
        };

        this.socketServer.on('v1/verification/veriff/receive', messageHandler);
        this.subscribers.set(Communication.identifier, messageHandler);
        return Communication.identifier;
    }

    unsubscribeVeriffVerification(id: number): void {
        const subscriber = this.subscribers.get(id);

        if (subscriber) {
            this.socketServer.off('v1/verification/veriff/receive', subscriber);
            this.subscribers.delete(id);
        }
    }

    subscribeSwapBaseToTonomy(subscriber: SwapSubscriber): number {
        Communication.identifier++;

        const messageHandler = async (memo: any) => {
            if (typeof memo !== 'string') {
                throwError('Invalid swap data received:', memo);
            }

            debug('Received swap from base to tonomy:', memo);

            // Call the subscriber with just the memo string
            await subscriber(memo);
        };

        this.socketServer.on('v1/swap/token/confirm', messageHandler);
        this.subscribers.set(Communication.identifier, messageHandler);
        return Communication.identifier;
    }

    unsubscribeSwapBaseToTonomy(id: number): void {
        const subscriber = this.subscribers.get(id);

        if (subscriber) {
            this.socketServer.off('v1/swap/token/confirm', subscriber);
            this.subscribers.delete(id);
        }
    }
}
