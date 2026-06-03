import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { BankingModule } from '../banking/banking.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BankingModule, AuthModule],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
