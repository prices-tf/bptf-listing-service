import { Test, TestingModule } from '@nestjs/testing';
import { TradeOfferUrlService } from './tradeofferurl.service';

describe('TradeOfferUrlService', () => {
  let service: TradeOfferUrlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TradeOfferUrlService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TradeOfferUrlService>(TradeOfferUrlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
