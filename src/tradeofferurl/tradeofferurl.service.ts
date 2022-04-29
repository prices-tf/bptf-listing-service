import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config, Services } from '../common/config/configuration';
import { TradeOfferUrl } from './interface/tradeofferurl.interface';

@Injectable()
export class TradeOfferUrlService {
  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
  ) {}

  async saveUrl(data: TradeOfferUrl): Promise<void> {
    const url = `${
      this.configService.get<Services>('services').tradeofferurl
    }/tradeofferurls`;

    await this.httpService.post(url, data).toPromise();
  }
}
