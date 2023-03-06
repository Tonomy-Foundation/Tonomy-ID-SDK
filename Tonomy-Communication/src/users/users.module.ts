import { Logger, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersGateway } from './users.gateway';
import { TransformVcPipe } from './transform-vc/transform-vc.pipe';

@Module({
  providers: [UsersGateway, UsersService, Logger, TransformVcPipe],
})
export class UsersModule {}
