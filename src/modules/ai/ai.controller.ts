import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { BankingService } from '../banking/banking.service';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly bankingService: BankingService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtGuard)
  @Post('chat')
  async chat(@Request() req, @Body() body: { message: string }) {
    const intent = await this.aiService.understandIntent(body.message);

    switch (intent.intent) {
      case 'CHECK_BALANCE':
        return this.bankingService.checkBalance(req.user.phone);

      case 'TRANSFER_MONEY':
        if (!intent.recipient || !intent.amount) {
          return {
            message: 'Please specify who to send money to and how much.',
          };
        }

        const fullName = intent.recipient.split(' ');
        const receiverAccount = fullName[1]
          ? await this.prisma.user.findFirst({
              where: { firstName: fullName[0], lastName: fullName[1] },
              include: { account: true },
            })
          : await this.prisma.user.findFirst({
              where: { firstName: fullName[0] },
              include: { account: true },
            });

        const transferMoneyDto = {
          receiverAccountNumber: receiverAccount?.account?.accountNumber,
          amount: intent.amount,
        };
        return this.bankingService.transferMoney(
          req.user.phone,
          transferMoneyDto,
        );

      case 'TRANSACTION_HISTORY':
        return this.bankingService.getTransactionHistory(req.user.phone);

      default:
        return {
          message:
            intent.response_message ||
            "I didn't understand that. Try asking about your balance or making a transfer.",
        };
    }
  }
}
