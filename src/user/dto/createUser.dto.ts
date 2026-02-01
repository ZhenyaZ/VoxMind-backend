export default class createUserDto {
  email: string;
  name: string;
  password: string;
  locale: string;
  timezone: string;
  providerId?: string;
  profilePictureUrl?: string;
  provider?: string;
}
