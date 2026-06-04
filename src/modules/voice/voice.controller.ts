import {
  Body,
  Request,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { BankingService } from '../banking/banking.service';
import { VoiceService } from './voice.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly aiService: AiService,
    private readonly bankingService: BankingService,
    private readonly voiceService: VoiceService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('chat')
  @UseGuards(JwtGuard)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: './uploads',
        filename(req, file, callback) {
          callback(null, `audio-${Date.now()}.webm`);
        },
      }),
    }),
  )
  async voiceChat(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      const phone = req.user.phone;
      // First convert audio to text
      const transcript = await this.voiceService.transcribeAudio(file.path);
      console.log(`Transcription: ${transcript}`);

      // Understand d intent of the client
      const intent = await this.aiService.understandIntentWithGroq(transcript);
      let result: any;

      // Execute banking action
      switch (intent.intent) {
        case 'CHECK_BALANCE':
          result = await this.bankingService.checkBalance(phone);
          break;

        case 'TRANSFER_MONEY':
          if (!intent.recipient || !intent.amount)
            result = {
              message: 'Please indicate who you want to send to and how much.',
            };

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

          result = await this.bankingService.transferMoney(phone, {
            receiverAccountNumber: receiverAccount?.account?.accountNumber,
            amount: intent.amount,
          });
          break;

        case 'TRANSACTION_HISTORY':
          result = await this.bankingService.getTransactionHistory(phone);
          break;

        default:
          result = {
            message:
              "I didn't catch that. Try saying 'check my balance' or 'send money to Emeka'.",
          };
      }

      //clean up uploaded audio file
      fs.unlinkSync(file.path);

      console.log(result);

      return {
        transcript,
        intent: intent.intent,
        ...result,
      };
    } catch (error) {
      console.error(`Voice chat error: ${error}`);
      if (file?.path) fs.unlinkSync(file.path);
      throw error;
    }
  }
}
