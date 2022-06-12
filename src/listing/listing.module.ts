import { Module } from '@nestjs/common';
import { ListingService } from './listing.service';
import { ListingController } from './listing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './models/listing.entity';
import { RabbitMQWrapperModule } from '../rabbitmq-wrapper/rabbitmq-wrapper.module';

@Module({
  imports: [TypeOrmModule.forFeature([Listing]), RabbitMQWrapperModule],
  providers: [ListingService],
  controllers: [ListingController],
})
export class ListingModule {}
