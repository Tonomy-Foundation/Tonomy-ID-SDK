import { io, Socket } from 'socket.io-client';
import { randomBytes } from './util/crypto';

export class Communication {
    socketServer: Socket;

    constructor() {
        console.log(`connecting to service ${process.env.COMMUNICATION_URL || 'ws://192.168.68.112:3002'}...`);
        this.socketServer = io(process.env.COMMUNICATION_URL || '192.168.68.112:3002', { transports: ['websocket'] });
    }

    /**
     * connect unregistered user to the website
     * @param randomSeed the random seed the user need to connect on typically recieved in jwt
     */
    connectTonomy(randomSeed: string) {
        console.log(this.socketServer.connected);
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
}
