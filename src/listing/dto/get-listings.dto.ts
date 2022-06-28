import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { ListingIntent } from '../enums/listing-intent.enum';

export enum OrderEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum OrderByEnum {
  lastSeenAt = 'lastSeenAt',
  lastCheckedAt = 'lastCheckedAt',
}

export class GetListingsDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  readonly page: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  readonly limit: number;

  @IsOptional()
  @IsEnum(ListingIntent)
  readonly intent: ListingIntent;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    } else if (value === 'false') {
      return false;
    }

    return value;
  })
  readonly deleted: boolean;

  @IsOptional()
  @IsEnum(OrderEnum)
  readonly order: OrderEnum;

  @IsOptional()
  @IsEnum(OrderByEnum)
  readonly orderBy: OrderByEnum;
}
