import { IsEnum } from 'class-validator';

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export class CreateWalletDto {
  @IsEnum(Currency)
  currency: Currency;
}