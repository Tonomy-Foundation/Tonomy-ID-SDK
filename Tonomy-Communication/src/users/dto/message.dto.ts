import { ApiProperty } from '@nestjs/swagger';
import { Message } from '@tonomy/tonomy-id-sdk';

export class MessageDto extends Message {}

export class MessageRto {
  @ApiProperty({
    description: 'A signed VC in JWT format',
    example: `eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ
      .eyJpc3MiOiJkaWQ6YW50ZWxvcGU6dGVsb3M6dW5pdmVyc2l0eSNwZXJtaXNzaW9uMCIsImp0aSI6Imh
      0dHBzOi8vZXhhbXBsZS5jb20vaWQvMTIzNDMyNCIsIm5iZiI6MTY3NjcxNDQ2OSwidmMiOnsiQGNvb
      nRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiY3JlZGVudGlhbFN
      1YmplY3QiOnsiZGVncmVlIjp7Im5hbWUiOiJCYWNjYWxhdXLDqWF0IGVuIG11c2lxdWVzIG51bcOpcmlxdWVzIi
      widHlwZSI6IkJhY2hlbG9yRGVncmVlIn19LCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl19fQ.
      oc9xx_owlXz8L_fhjXo-mNhWNWl7YoMAr50HAJ5-On2p_RgoJ-E8SWDrHkITQnr9ysSKa1pF7gUWbFdiLSuL3AA`,
  })
  message!: string;
}
