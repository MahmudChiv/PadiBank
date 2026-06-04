import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async 

  async getUserByAccNo(accountNumber: string) {
    const account = this.prisma.account.findUnique({
      where: { accountNumber: accountNumber },
      include: { user: true },
    });

    if (!account)
      throw new BadRequestException(`No registered user with ${accountNumber}`);

    return account;
  }

  //Check Account Balance
  async checkBalance(phone: string) {
    const user = await this.getUserByPhone(phone);

    return {
      status: 'success',
      name: `${user.firstName} ${user.lastName}`,
      balance: user.account!.balance,
      message: `${user.firstName}, your current balance is ₦${user.account!.balance.toLocaleString()}.`,
    };
  }

  // Transfer Money
  async transferMoney(
    authenticatedUserPhone: string,
    transferDto: TransferMoneyDto,
  ) {
    const sender = await this.getUserByPhone(authenticatedUserPhone);
    const { receiverAccountNumber, amount } = transferDto;

    if (sender.account?.balance! < amount) {
      return {
        status: 'error',
        message: 'Insufficient account balance!',
      };
    }

    const recipient = await this.getUserByAccNo(receiverAccountNumber!);

    if (!recipient)
      throw new NotFoundException(
        `No user with ${receiverAccountNumber} found`,
      );

    await this.prisma.$transaction([
      //Deduct from sender
      this.prisma.account.update({
        where: { id: sender.account?.id },
        data: { balance: { decrement: amount } },
      }),

      //Add to Recipient
      this.prisma.account.update({
        where: { id: recipient.id },
        data: { balance: { increment: amount } },
      }),

      //Record transaction for sender
      this.prisma.transaction.create({
        data: {
          accountId: sender.account?.id!,
          type: 'DEBIT',
          amount,
          description: `Transfer to ${receiverAccountNumber}`,
        },
      }),

      //Record transaction for receiver
      this.prisma.transaction.create({
        data: {
          accountId: recipient.id!,
          type: 'CREDIT',
          amount,
          description: `Recieved money from ${sender.firstName} ${sender.lastName}`,
        },
      }),
    ]);

    return {
      status: 'success',
      message: `You've successfully transferred ₦${amount} to ${recipient.user.firstName} ${recipient.user.lastName}. Your new balance is ₦${(sender.account?.balance! - amount).toLocaleString()}`,
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
        firstName: 'Mahmud',
        lastName: 'Adegboyega',
        email: 'mahmud.adegboyega@gmail.com',
        phone: '08164247735',
        password: 'Qvcdni32$3%',
        pin: '42748329',
        account: {
          create: {
            accountNumber: '2849374583',
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
        firstName: 'Sayyid',
        lastName: 'Abdullah',
        email: 'adegboyegamsen2024@futa.edu.ng',
        phone: '08053112170',
        password: 'wdbj@32cS',
        pin: '5678',
        account: {
          create: {
            accountNumber: '4321894509',
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
