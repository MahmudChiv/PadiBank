import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async hashValue(value: string) {
    return await bcrypt.hash(value, 10);
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateUniqueAccountNumber(): Promise<string> {
    let accountNumber: string = '';
    let isUnique = false;

    while (!isUnique) {
      accountNumber = Math.floor(
        1000000000 + Math.random() * 9000000000,
      ).toLocaleString();

      const existingAccountNumber = await this.prisma.account.findUnique({
        where: { accountNumber: accountNumber },
      });

      if (!existingAccountNumber) isUnique = true;
    }

    return accountNumber;
  }

  async getUserByPhone(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { account: true },
    });
    if (!user) throw new UnauthorizedException('Phone number not found!');

    return user;
  }

  async register(registerDto: RegisterDto) {
    const userExist = await this.prisma.user.findUnique({
      where: { phone: registerDto.phone },
    });
    if (userExist)
      throw new ConflictException(
        'A user with this phone number already exist!',
      );

    const passwordHash = await this.hashValue(registerDto.password);
    const pinHash = await this.hashValue(registerDto.pin);
    const code = this.generateOtp();

    try {
      await this.mailService.sendVerificationMail(
        registerDto.email,
        code,
        registerDto.firstName,
      );
    } catch (error) {
      throw error;
    }

    const newUser = await this.prisma.user.create({
      data: {
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        email: registerDto.email,
        phone: registerDto.phone,
        pin: pinHash,
        password: passwordHash,
        otp: code,
        onboardingComplete: false,
        account: {
          create: {
            accountNumber: await this.generateUniqueAccountNumber(),
            balance: 0,
          },
        },
      },
    });

    const token = await this.jwtService.signAsync({
      sub: newUser.id,
      phone: newUser.phone,
    });

    return {
      accessToken: token,
      message: `You've successfully signed up, proceed to verify your email`,
    };
  }

  async verifyEmail(phone: string, code: string) {
    const user = await this.getUserByPhone(phone);
    if (code !== user.otp) throw new BadRequestException('Incorrect otp!');

    await this.prisma.user.update({
      where: { phone: phone },
      data: {
        otp: null,
        onboardingComplete: true,
      },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  async login(phone: string, pin: string) {
    const user = await this.getUserByPhone(phone);

    const isMatch = await bcrypt.compare(pin, user.pin)
    if (!isMatch) throw new UnauthorizedException('Incorrect pin!!');

    const payload = {
      sub: user.id,
      phone: user.phone,
    };
    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
        balance: user.account!.balance,
      },
    };
  }

  async validateToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token or expired token!');
    }
  }
}
