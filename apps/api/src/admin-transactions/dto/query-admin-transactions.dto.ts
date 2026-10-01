import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAdminTransactionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'])
  status?: string;

  @IsOptional()
  @IsIn(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'])
  type?: string;

  @IsOptional()
  @IsIn(['NGN', 'USD', 'EUR', 'GBP'])
  currency?: string;

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