import { IsString } from 'class-validator';

export class TransferMoneyDto {
  @IsString()
  receiverName!: string;

  @IsString()
  amount!: number;
}
