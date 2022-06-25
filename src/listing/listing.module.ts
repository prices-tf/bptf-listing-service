import { Module } from '@nestjs/common';
import { ListingService } from './listing.service';
import { ListingController } from './listing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './models/listing.entity';
import { RabbitMQWrapperModule } from '../rabbitmq-wrapper/rabbitmq-wrapper.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    BullModule.registerQueue({
      name: 'listings',
    }),
    RabbitMQWrapperModule,
  ],
  providers: [ListingService],
  controllers: [ListingController],
})
export class ListingModule {}
