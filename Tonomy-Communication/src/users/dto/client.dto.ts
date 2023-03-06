import { Socket } from 'socket.io';

export class Client extends Socket {
  did!: string;
}
