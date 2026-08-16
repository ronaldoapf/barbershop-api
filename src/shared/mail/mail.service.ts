export interface SendBarberInviteEmailParams {
  to: string;
  name: string;
  token: string;
}

export abstract class IMailService {
  abstract sendBarberInviteEmail(
    params: SendBarberInviteEmailParams,
  ): Promise<void>;
}
