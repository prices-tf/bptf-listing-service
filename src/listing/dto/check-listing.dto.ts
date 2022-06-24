import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsPositive, Max } from 'class-validator';

export class CheckListingDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  delay?: number;

  @IsOptional()
  @IsBoolean()
  replace?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(Number.MAX_SAFE_INTEGER)
  priority?: number;
}
