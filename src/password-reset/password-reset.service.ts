import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import Redis from 'ioredis';
import { Resend } from 'resend';
import { REDIS } from 'src/redis/redis.constants';
import { UserService } from 'src/user/user.service';
@Injectable()
export class PasswordResetService {
  private resend: Resend;
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API'));
  }

  async sendCode(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) return;
    const codeExist = await this.redis.exists(`user:pwd-reset:${user?.id}`);
    if (codeExist) return;
    const code = randomBytes(4).toString('hex').toUpperCase();
    const hash = createHash('sha256').update(code).digest('hex');
    const expirationMinutes = 5;
    const { html } = this.buildPasswordResetEmailTemplate(code, expirationMinutes);

    await this.resend.emails.send({
      from: `Voxly Team <${String(process.env.PORKBUN_EMAIL!)}>`,
      to: [email],
      subject: 'Voxly - Password Recovery Code',
      replyTo: 'support@zhenyaz.dev',
      html,
    });
    await this.redis.set(
      `user:pwd-reset:${user?.id}`,
      JSON.stringify({
        hash: hash,
        attempts: 0,
        timestamp: new Date().getTime() + 300000,
      }),
      'EX',
      60 * 5,
    );
  }

  private buildPasswordResetEmailTemplate(code: string, expirationMinutes: number): { html: string; text: string } {
    const text = [
      'Voxly password reset',
      '',
      `Your verification code: ${code}`,
      `Code expires in ${expirationMinutes} minutes.`,
      '',
      'Project page: https://voxly.apps.zhenyaz.dev',
      '',
      'If you did not request this, please ignore this email.',
    ].join('\n');

    const html = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Voxly Password Reset</title>
</head>
<body style="margin:0; padding:0; background-color:#0b1220; font-family:Arial, Helvetica, sans-serif; color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0b1220; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background:linear-gradient(180deg,#1f2937 0%,#111827 100%); border:1px solid rgba(255,255,255,0.1); border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px 28px; background:linear-gradient(135deg,#818cf8 0%,#6366f1 100%);">
              <div style="font-size:12px; letter-spacing:1.2px; text-transform:uppercase; opacity:0.9;">Voxly Security</div>
              <h1 style="margin:10px 0 0 0; font-size:24px; line-height:1.25; font-weight:700; color:#ffffff;">Password Recovery Code</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px 28px;">
              <p style="margin:0 0 14px 0; color:#d1d5db; font-size:15px; line-height:1.6;">
                We received a request to reset your Voxly password. Use the code below in the app:
              </p>
              <div style="margin:16px 0 18px 0; padding:14px 18px; background-color:#0f172a; border:1px solid rgba(129,140,248,0.45); border-radius:12px; text-align:center;">
                <span style="display:inline-block; font-size:30px; line-height:1; letter-spacing:8px; font-weight:700; color:#a5b4fc;">${code}</span>
              </div>
              <p style="margin:0 0 14px 0; color:#d1d5db; font-size:14px; line-height:1.6;">
                This code is valid for <strong style="color:#ffffff;">${expirationMinutes} minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 28px 24px 28px;">
              <div style="padding:12px 14px; border-radius:10px; background-color:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); color:#fecaca; font-size:13px; line-height:1.5;">
                If this was not you, please ignore this message. Never share this code with anyone.
              </div>
              <p style="margin:20px 0 0 0; color:#9ca3af; font-size:12px; line-height:1.5;">
                Voxly - Automated message
              </p>
              <p style="margin:10px 0 0 0; color:#9ca3af; font-size:12px; line-height:1.5;">
                App project page:
                <a href="https://voxly.apps.zhenyaz.dev" style="color:#a5b4fc; text-decoration:none;">voxly.apps.zhenyaz.dev</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { html, text };
  }

  async verify(email: string, code: string, newPassword: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) return;
    const codeExist = await this.redis.exists(`user:pwd-reset:${user?.id}`);
    if (!codeExist) throw new BadRequestException('Code expired, request new code');
    const cache = await this.redis.get(`user:pwd-reset:${user?.id}`);
    const codeTimestamp = JSON.parse(cache!).timestamp!;
    const attempts = Number(JSON.parse(cache!).attempts!);
    if (codeTimestamp < new Date().getTime()) {
      await this.redis.del(`user:pwd-reset:${user?.id}`);
      throw new BadRequestException('Code expired, request new code');
    }
    if (attempts >= 3) {
      await this.redis.del(`user:pwd-reset:${user?.id}`);
      throw new BadRequestException('Too many attempts, request new code');
    }
    const hash = createHash('sha256').update(code).digest('hex');
    if (hash !== JSON.parse(cache!).hash) {
      await this.redis.set(
        `user:pwd-reset:${user?.id}`,
        JSON.stringify({
          hash: JSON.parse(cache!).hash,
          attempts: attempts + 1,
          timestamp: JSON.parse(cache!).timestamp!,
        }),
      );
    } else {
      return await this.userService.updatePassword(user.id, newPassword);
    }
  }
}
