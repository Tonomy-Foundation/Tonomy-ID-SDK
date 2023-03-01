import { io, Socket } from 'socket.io-client';
import { getSettings } from './settings';
import { Message } from './util/message';

type Subscriber = (message: Message) => Promise<void>;

export class Communication {
    socketServer: Socket;

    constructor() {
        const url = getSettings().communicationUrl;

        this.socketServer = io(url, {
            transports: ['websocket'],
        });
    }

    /* connects to the Tonomy Communication server, authenticates with it's DID
     * subscribes to any messages that are sent by `sendMessage` by providing a callback function executed every time a message is received
     * should send a read receipt when messages are received
     * @returns true if successful
     */
    login(authorization: Message): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.socketServer.emit('login', { message: authorization.jwt }, (response: any) => {
                if (response.err) {
                    reject(response.err);
                }

                resolve(response);
            });
        });
    }

    /* sends a message to another DID
     * create a Message object from the message argument
     * the message is used as the `vc` property of a VC signed by the User's key
     */
    sendMessage(message: Message): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.socketServer.emit('message', message.jwt, (response: any) => {
                if (response.err) {
                    reject(response.err);
                }

                resolve(response);
            });
        });
    }

    // // function that adds a new subscriber, which is called every time a message is received
    // subscribeMessage(subscriber: Subscriber);

    // // unsubscribes a function from the receiving a message
    // unsubscribeMessage(subscriber: Subscriber);

    disconnect() {
        this.socketServer.disconnect();
    }
}
