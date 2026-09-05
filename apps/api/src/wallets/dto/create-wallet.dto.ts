import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['NGN', 'USD', 'EUR', 'GBP'])
  currency: string;
}
