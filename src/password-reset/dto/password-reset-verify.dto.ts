import { IsEmail, IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

export class PasswordResetVerifyDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 8)
  code!: string;

  @IsString()
  @MinLength(6)
  @Matches(/^\S+$/, { message: 'Password must not contain spaces' })
  newPassword!: string;
}
