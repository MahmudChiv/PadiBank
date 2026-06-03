import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import Groq from 'groq-sdk';

@Injectable()
export class AiService {
  private model!: GenerativeModel;
  private groq!: Groq;

  constructor(private configService: ConfigService) {
    const genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY') as string,
    );

    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });

    this.model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: `You are a banking assistant for Nigerian user.
        Your job is to understand what the user intends to do and return a structured JSON response.

        Possible Intents: CHECK_BALANCE, TRANSFER_MONEY, TRANSACTION_HISTORY, UNKNOWN

        Always respond with ONLY this structured json format, no extra texts
        {
         "intent": "CHECK_BALANCE",
          "amount": number | null,
          "recipient": null,
          "language_detected": <the language the user speaks>,
          "response_message": "You want to check your balance, let me get that for you."
        } `,
    });
  }

  async understandIntentWithGemini(userMessage: string): Promise<any> {
    const result = await this.model.generateContent(userMessage);
    const text = result.response.text();

    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(cleaned);
  }

  async understandIntentWithGroq(userMessage: string): Promise<any> {
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a banking assistant for Nigerian users.
          Your job is to understand what the user wants to do and return
          a structured JSON response.

          Possible intents: CHECK_BALANCE, TRANSFER_MONEY, TRANSACTION_HISTORY, UNKNOWN

          Always respond with ONLY this JSON format, no extra text, no markdown, no backticks:
          {
            "intent": "CHECK_BALANCE",
            "amount": null,
            "recipient": null,
            "language_detected": "english",
            "response_message": "You want to check your balance, let me get that for you."
          }`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.1, // low temperature = more consistent JSON output
    });

    const text = response.choices[0].message.content;

    // Clean just in case
    const cleaned = text!
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(cleaned);
  }

  async understandIntent(userMessage: string) {
    try {
      return await this.understandIntentWithGemini(userMessage);
    } catch (error: any) {
      if (error.status === 429) {
        console.log('Gemini rate limited, falling back to Groq...');
        return await this.understandIntentWithGroq(userMessage);
      }
      throw error;
    }
  }
}
