import { Socket } from 'socket.io-client';
import { Message } from './util/message';
export declare type Subscriber = (message: string) => void;
export declare class Communication {
    socketServer: Socket;
    /**
     * Connects to the Tonomy Communication server
     *
     * @returns {Promise<void>}
     * @throws {SdkError} CommunicationNotConnected
     */
    private connect;
    /**
     * Sends a Message object through a websocket connection to the Tonomy Communication server
     *
     * @param {string} event - the name of the event to emit
     * @param {Message} message - the Message object to send
     * @returns {Promise<boolean>} - true if successful and acknowledged by the server
     * @throws {SdkError} - CommunicationTimeout
     */
    private emitMessage;
    /**
     * connects to the Tonomy Communication server, authenticates with it's DID
     * subscribes to any messages that are sent by `sendMessage` by providing a callback function executed every time a message is received
     * should send a read receipt when messages are received
     * @returns {boolean} - true if successful
     */
    login(authorization: Message): Promise<boolean>;
    sendMessage(message: Message): Promise<boolean>;
    subscribeMessage(subscriber: Subscriber): void;
    unsubscribeMessage(subscriber: Subscriber): void;
    disconnect(): void;
}
