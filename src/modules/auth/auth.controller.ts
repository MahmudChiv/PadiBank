import {
  Body,
  Controller,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { JwtGuard } from 'src/common/guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body);

    res.cookie('accessToken', result.accessToken, {
      maxAge: 60 * 60 * 1000,
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
    });

    return result;
  }

  @UseGuards(JwtGuard)
  @Post('email')
  async verifyEmail(@Body('code') code: string, @Request() req) {
    const result = this.authService.verifyEmail(req.user.phone, code);
  }

  @Post('login')
  async login(
    @Body() body: { phone: string; pin: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body.phone, body.pin);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    return { message: 'Logged out successfully' };
  }
}
