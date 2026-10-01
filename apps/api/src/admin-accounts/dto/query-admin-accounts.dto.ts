import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAdminAccountsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'FROZEN', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsIn(['NGN', 'USD', 'EUR', 'GBP'])
  currency?: string;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}