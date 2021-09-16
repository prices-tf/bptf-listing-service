import { Module } from '@nestjs/common';
import { ListingService } from './listing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listing/models/listing.entity';
import { RabbitMQWrapperModule } from '../rabbitmq-wrapper/rabbitmq-wrapper.module';

@Module({
  imports: [TypeOrmModule.forFeature([Listing]), RabbitMQWrapperModule],
  providers: [ListingService],
})
export class ListingModule {}
