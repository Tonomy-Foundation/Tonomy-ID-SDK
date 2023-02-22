import { io, Socket } from 'socket.io-client';
import { getSettings } from './settings';

export class Communication {
    socketServer: Socket;

    constructor() {
        const url = getSettings().communicationUrl;

        this.socketServer = io(url, {
            transports: ['websocket'],
        });
    }

    /**
     * connect unregistered user to the website
     * @param randomSeed the random seed the user need to connect on typically recieved in jwt
     */
    connectTonomy(randomSeed: string) {
        this.socketServer.emit('connectTonomy', { randomSeed });
    }

    onClientConnected(func: (param?: any) => void) {
        this.socketServer.on('connectTonomy', (param) => {
            func(param);
        });
    }

    /**
     * makes user login to websites
     */
    login(userName: string, client: string) {
        this.socketServer.emit('loginTonomy', { client, userName });
    }

    /**
     * unregistered website can send jwts to mobile
     * awaits until the mobile user is connected then sends it the jwt
     */
    sendJwtToMobile(requests: string) {
        this.onClientConnected(() => {
            this.sendJwtToClient(requests);
            this.socketServer.off('connectTonomy');
        });
    }

    sendJwtToBrowser(requests: string, accountName: string) {
        this.sendJwtToClient(requests, accountName);
    }

    sendJwtToClient(requests: string, accountName?: string) {
        this.socketServer.emit('sendLoginJwt', { requests, accountName });
    }

    onJwtToClient(func: (param?: any) => void) {
        this.socketServer.on('sendLoginJwt', (param) => {
            func(param);
        });
    }

    SSOWebsiteSendToMobile(randomSeed: string, requests: string) {
        this.connectTonomy(randomSeed);
        this.sendJwtToMobile(requests);
    }

    disconnect() {
        this.socketServer.disconnect();
    }
}
