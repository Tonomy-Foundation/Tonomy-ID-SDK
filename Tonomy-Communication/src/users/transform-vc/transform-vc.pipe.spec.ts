import { MessageDto } from '../dto/message.dto';
import { TransformVcPipe } from './transform-vc.pipe';

describe('TransformVcPipe', () => {
  it('should be defined', () => {
    expect(new TransformVcPipe()).toBeDefined();
  });

  it('must transform antelope VC into message object', () => {
    const vc =
      'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJkaWQ6YW50ZWxvcGU6dGVsb3M6dW5pdmVyc2l0eSNwZXJtaXNzaW9uMCIsImp0aSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vaWQvMTIzNDMyNCIsIm5iZiI6MTY3NjcxNDQ2OSwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiZGVncmVlIjp7Im5hbWUiOiJCYWNjYWxhdXLDqWF0IGVuIG11c2lxdWVzIG51bcOpcmlxdWVzIiwidHlwZSI6IkJhY2hlbG9yRGVncmVlIn19LCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl19fQ.oc9xx_owlXz8L_fhjXo-mNhWNWl7YoMAr50HAJ5-On2p_RgoJ-E8SWDrHkITQnr9ysSKa1pF7gUWbFdiLSuL3AA';
    const pipe = new TransformVcPipe();
    const result = pipe.transform(vc, { type: 'body' });

    expect(result).toBeTruthy();
    expect(result).toBeInstanceOf(MessageDto);
  });
});
