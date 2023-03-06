import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  @Get()
  checkHealth(): HttpStatus {
    return this.appService.healthCheck();
  }
}
