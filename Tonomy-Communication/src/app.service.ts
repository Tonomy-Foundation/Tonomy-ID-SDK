import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  healthCheck(): HttpStatus {
    return HttpStatus.OK;
  }
}
