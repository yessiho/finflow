import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum WalletAccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
  VIRTUAL = 'VIRTUAL',
}

export class CreateWalletAccountDto {
  @IsString()
  @MaxLength(100)
  accountName: string;

  @IsString()
  @MaxLength(100)
  bankName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankCode?: string;

  @IsOptional()
  @IsEnum(WalletAccountType)
  accountType?: WalletAccountType;
}