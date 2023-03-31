import { io, Socket } from 'socket.io-client';
import { createSdkError, SdkErrors } from './services/errors';
import { getSettings } from './settings';
import { Message } from './util/message';

export type Subscriber = (message: Message) => void;

export class Communication {
    socketServer: Socket;
    private identifier: 0;
    private subscribers = new Map<number, Subscriber>();

    /**
     * Connects to the Tonomy Communication server
     *
     * @returns {Promise<void>}
     * @throws {SdkError} CommunicationNotConnected
     */
    private async connect(): Promise<void> {
        if (this.socketServer?.connected) return; // dont override socket if connected
        const url = getSettings().communicationUrl;

        this.socketServer = io(url, {
            transports: ['websocket'],
        });

        await new Promise((resolve, reject) => {
            this.socketServer.on('connect', () => {
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

            this.socketServer.emit(event, { message: message.jwt }, (response: any) => {
                if (response.error) {
                    reject(response);
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
     * subscribes to any messages that are sent by `sendMessage` by providing a callback function executed every time a message is received
     * should send a read receipt when messages are received
     * @returns {boolean} - true if successful
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

    /**
     * function that adds a new subscriber, which is called every time a message is received
     *
     * @param {Subscriber} subscriber - the message object
     * @param {string} type - the Message object to send
     * @returns {number} - identifier which will be used for unsubscribe
     */
    subscribeMessage(subscriber: Subscriber, type?:string): number {
        this.identifier++;
        const messageHandler = (message: any) => {
            const msg = new Message(message)
            if(!type || msg.getType() === type) {
                subscriber(msg)
            }
        }
        this.socketServer.on('message', messageHandler);
        this.subscribers.set(this.identifier, messageHandler);
        return this.identifier;
    }

     /**
     * unsubscribes a function from the receiving a message
     *
     * @param {number} id - identifier which will be used for unsubscribe]
     * @returns void 
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
