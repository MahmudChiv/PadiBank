import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './modules/ai/ai.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { BankingModule } from './modules/banking/banking.module';
import { VoiceModule } from './modules/voice/voice.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { BullModule } from '@nestjs/bull';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: +process.env.REDIS_PORT!,
      },
    }),
    AiModule,
    PrismaModule,
    BankingModule,
    VoiceModule,
    AuthModule,
    MailModule
  ],
})
export class AppModule {}
