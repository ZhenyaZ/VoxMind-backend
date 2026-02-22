export class UpdatePushTokenDto {
  pushToken?: string;
  deviceName?: string;
  deviceId?: string;
  platform?: 'android' | 'ios';
}
