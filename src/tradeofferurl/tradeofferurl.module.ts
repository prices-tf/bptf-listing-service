import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TradeOfferUrlService } from './tradeofferurl.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [TradeOfferUrlService],
  exports: [TradeOfferUrlService],
})
export class TradeOfferUrlModule {}
