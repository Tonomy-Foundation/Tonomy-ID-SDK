import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { MessageDto, MessageRto } from '../dto/message.dto';

@Injectable()
export class TransformVcPipe implements PipeTransform {
  transform(value: MessageRto, metadata: ArgumentMetadata) {
    if (metadata.type === 'body') {
      return new MessageDto(value.message);
    }

    return value;
  }
}
