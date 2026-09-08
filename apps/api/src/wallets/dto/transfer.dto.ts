import { IsInt, IsPositive } from 'class-validator';

export class TransferDto {
  @IsInt()
  @IsPositive()
  destinationWalletId: number;

  @IsInt()
  @IsPositive()
  amount: number;
}