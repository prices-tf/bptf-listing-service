import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { ListingIntent } from '../enums/listing-intent.enum';

enum OrderEnum {
  ASC = 'ASC',
  DESC = 'DESC',
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

  @IsEnum(ListingIntent)
  readonly intent: ListingIntent;

  @IsOptional()
  @IsEnum(OrderEnum)
  readonly order: OrderEnum;
}
