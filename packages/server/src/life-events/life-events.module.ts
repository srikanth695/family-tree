import { Module } from '@nestjs/common';
import { LifeEventService } from './life-events.service';
import { LifeEventController } from './life-events.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [LifeEventController],
  providers: [LifeEventService],
})
export class LifeEventModule {}
