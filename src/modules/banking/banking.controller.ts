import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { BankingService } from './banking.service';
import { TransferMoneyDto } from './dto/transferMoney.dto';
import { JwtGuard } from 'src/common/guards/jwt.guard';

@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @UseGuards(JwtGuard)
  @Get('balance')
  async checkBalance(@Request() req) {
    return await this.bankingService.checkBalance(req.user.phone);
  }

  @UseGuards(JwtGuard)
  @Post('transfer')
  async transferMoney(
    @Request() req,
    @Body() body: TransferMoneyDto,
  ) {
    return await this.bankingService.transferMoney(req.user.phone, body);
  }

  @UseGuards(JwtGuard)
  @Get('history')
  async getTransactionHistory(@Request() req) {
    return await this.bankingService.getTransactionHistory(req.user.phone);
  }

  @Get('seed')
  async seedTestUsers() {
    return await this.bankingService.seedTestUsers();
  }
}
