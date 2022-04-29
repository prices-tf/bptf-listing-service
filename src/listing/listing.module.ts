import { Module } from '@nestjs/common';
import { ListingService } from './listing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listing/models/listing.entity';
import { RabbitMQWrapperModule } from '../rabbitmq-wrapper/rabbitmq-wrapper.module';
import { ListingController } from './listing.controller';
import { TradeOfferUrlModule } from '../tradeofferurl/tradeofferurl.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    RabbitMQWrapperModule,
    TradeOfferUrlModule,
  ],
  providers: [ListingService],
  controllers: [ListingController],
})
export class ListingModule {}
