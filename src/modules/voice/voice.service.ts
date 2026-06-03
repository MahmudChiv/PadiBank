import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import * as fs from 'fs';

@Injectable()
export class VoiceService {
  private groq!: Groq;

  constructor(private configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async transcribeAudio(filePath: string) {
    const transcription = await this.groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3',
      language: 'en',
      prompt:
        'Nigerian English, Pidgin English. Banking terms: balance, transfer, send money, account, naira.', // ADD THIS
    });

    return transcription.text;
  }
}
