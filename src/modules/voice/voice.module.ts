import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { AiModule } from '../ai/ai.module';
import { BankingModule } from '../banking/banking.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AiModule, BankingModule, AuthModule],
  providers: [VoiceService],
  controllers: [VoiceController],
})
export class VoiceModule {}
