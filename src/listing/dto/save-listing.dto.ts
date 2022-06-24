import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { IsSteamID64 } from '../../common/decorator/validation/IsSteamID64';

class UserDto {
  @IsDefined()
  @IsSteamID64()
  id: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsBoolean()
  premium: boolean;

  @IsDefined()
  @IsBoolean()
  online: boolean;

  @IsDefined()
  @IsBoolean()
  banned: boolean;

  @IsDefined()
  @IsUrl()
  tradeOfferUrl: string;

  @IsDefined()
  @IsBoolean()
  isMarketplaceSeller: boolean;
}

class UserAgentDto {
  @IsDefined()
  @IsString()
  client: string;

  @IsDefined()
  @IsNumber()
  lastPulse: number;
}

class CurrenciesDto {
  @IsNumber()
  @IsOptional()
  keys?: number;

  @IsNumber()
  @IsOptional()
  metal?: number;

  @IsNumber()
  @IsOptional()
  usd?: number;
}

class ListingDto {
  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsSteamID64()
  steamid: string;

  @IsDefined()
  @IsNumber()
  appid: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => CurrenciesDto)
  currencies: CurrenciesDto;

  @IsBoolean()
  @IsOptional()
  tradeOffersPreferred?: boolean;

  @IsOptional()
  @IsBoolean()
  buyoutOnly?: boolean;

  @IsDefined()
  @IsString()
  details: string;

  @IsDefined()
  @IsNumber()
  listedAt: number;

  @IsDefined()
  @IsNumber()
  bumpedAt: number;

  @IsDefined()
  @IsString()
  intent: string;

  @IsOptional()
  @IsBoolean()
  promoted: boolean;

  @IsDefined()
  @IsNumber()
  count: number;

  @IsDefined()
  @IsString()
  status: string;

  @IsDefined()
  @IsString()
  source: string;

  @IsDefined()
  item: any;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserAgentDto)
  userAgent?: {
    client: string;
    lastPulse: number;
  };

  @IsDefined()
  @ValidateNested()
  @Type(() => UserDto)
  user: UserDto;
}

export class SaveListingDto {
  @IsDefined()
  @IsDate()
  @Type(() => Date)
  time: Date;

  @IsDefined()
  @ValidateNested()
  @Type(() => ListingDto)
  listing: ListingDto;
}
