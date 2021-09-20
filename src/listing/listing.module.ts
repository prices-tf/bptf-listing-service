import { Module } from '@nestjs/common';
import { ListingService } from './listing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listing/models/listing.entity';
import { RabbitMQWrapperModule } from '../rabbitmq-wrapper/rabbitmq-wrapper.module';
import { ListingController } from './listing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Listing]), RabbitMQWrapperModule],
  providers: [ListingService],
  controllers: [ListingController],
})
export class ListingModule {}
