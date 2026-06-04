import { IsString } from 'class-validator';

export class TransferMoneyDto {
  @IsString()
  receiverAccountNumber?: string;

  @IsString()
  amount!: number;
}
