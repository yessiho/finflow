import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReverseTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
