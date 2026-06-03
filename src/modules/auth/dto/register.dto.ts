import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import * as bcrypt from 'bcrypt';

async function hashValue(value: string) {
  return await bcrypt.hash(value, 10);
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Provide your Name!' })
  firstName!: string;
  
  @IsString()
  @IsNotEmpty({ message: 'Provide your Name!' })
  lastName!: string;

  @IsEmail({}, { message: 'Enter a valid Email!' })
  @IsNotEmpty({ message: 'Enter your email address!' })
  @Transform((value: unknown) =>
    typeof value === 'string' ? value.trim().toLocaleLowerCase() : value,
  )
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your phone number!' })
  @MinLength(11, { message: 'Enter a correct phone number' })
  @MaxLength(11, { message: 'Enter a correct phone number' })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your pin!' })
  @MinLength(6, { message: 'Pin must be at least 6 characters!' })
  @MaxLength(8, { message: 'Pin must be at most 8 characters!' })
  @Matches(/^(?=.*\d{6,8})(?!.*(\d)\1{1})$/, {
    message: 'Pin must not be repeated!',
  })
  pin!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your password' })
  @MinLength(8, { message: 'Password must be at least 8 characters!' })
  @MaxLength(20, { message: 'Password must be at most 20 characters!' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Password must contain at least one uppercase, one number and one special character',
  })
  password!: string;
}
