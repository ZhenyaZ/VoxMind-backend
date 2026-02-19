export class LoginDto {
  email: string;
  password: string;
  pushToken?: string;
  deviceName?: string;
  deviceId?: string;
  platform?: 'android' | 'ios';
}
