import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferMoneyDto } from './dto/transferMoney.dto';

@Injectable()
export class BankingService {
  constructor(private prisma: PrismaService) {}

  async getUserByPhone(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { account: true },
    });

    if (!user) throw new NotFoundException('User not found!');
    return user;
  }

  //Check Account Balance
  async checkBalance(phone: string) {
    const user = await this.getUserByPhone(phone);

    return {
      status: 'success',
      name: user.name,
      balance: user.account?.balance,
      message: `${user.name}, your current balance is ₦${user.account!.balance.toLocaleString()}.`,
    };
  }

  // Transfer Money
  async transferMoney(authenticatedUserPhone, transferDto: TransferMoneyDto) {
    const sender = await this.getUserByPhone(authenticatedUserPhone);
    const { receiverName, amount } = transferDto;

    if (sender.account?.balance! < amount) {
      return {
        status: 'error',
        message: 'Insufficient account balance!',
      };
    }

    const recipient = await this.prisma.user.findFirst({
      where: { name: { contains: receiverName } },
      include: { account: true },
    });

    if (!recipient)
      throw new NotFoundException(`No user with ${receiverName} found`);

    await this.prisma.$transaction([
      //Deduct from sender
      this.prisma.account.update({
        where: { id: sender.account?.id },
        data: { balance: { decrement: amount } },
      }),

      //Add to Recipient
      this.prisma.account.update({
        where: { id: recipient.account?.id },
        data: { balance: { increment: amount } },
      }),

      //Record transaction for sender
      this.prisma.transaction.create({
        data: {
          accountId: sender.account?.id!,
          type: 'DEBIT',
          amount,
          description: `Transfer to ${receiverName}`,
        },
      }),

      //Record transaction for receiver
      this.prisma.transaction.create({
        data: {
          accountId: recipient.account?.id!,
          type: 'CREDIT',
          amount,
          description: `Recieved money from ${sender.name}`,
        },
      }),
    ]);

    return {
      status: 'success',
      message: `You've successfully transferred ${amount} to ${receiverName}. Your new balance is ${(sender.account?.balance! - amount).toLocaleString()}`,
    };
  }

  //View Transactions
  async getTransactionHistory(phone: string) {
    const user = await this.getUserByPhone(phone);

    const transactions = await this.prisma.transaction.findMany({
      where: { accountId: user.account?.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (transactions.length === 0)
      return {
        status: 'success',
        message: "You've not made any transactions yet",
      };

    const summary = transactions
      .map(
        (t: any) =>
          `${t.type === 'CREDIT' ? '🟢' : '🔴'} ${t.type} ₦${t.amount.toLocaleString()} — ${t.description}`,
      )
      .join('\n');

    return {
      message: `Here are your last ${transactions.length} transactions:\n${summary}`,
      transactions,
    };
  }

  // Seed a test user (so you have data to test with)
  async seedTestUsers() {
    const existing = await this.prisma.user.findUnique({
      where: { phone: '08012345678' },
    });

    if (existing) return { message: 'Test users already exist' };

    // Create Mahmud
    await this.prisma.user.create({
      data: {
        name: 'Mahmud',
        phone: '08012345678',
        pin: '1234',
        account: {
          create: {
            balance: 50000,
            transactions: {
              create: [
                {
                  type: 'CREDIT',
                  amount: 50000,
                  description: 'Initial deposit',
                },
              ],
            },
          },
        },
      },
    });

    // Create Emeka (so you can test transfers)
    await this.prisma.user.create({
      data: {
        name: 'Emeka',
        phone: '08087654321',
        pin: '5678',
        account: {
          create: {
            balance: 20000,
            transactions: {
              create: [
                {
                  type: 'CREDIT',
                  amount: 20000,
                  description: 'Initial deposit',
                },
              ],
            },
          },
        },
      },
    });

    return { message: 'Test users created successfully' };
  }
}
