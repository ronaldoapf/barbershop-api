import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { IMailService, SendBarberInviteEmailParams } from './mail.service';

const DEV_RECIPIENT_OVERRIDE = 'ronaldo.alves.1997@gmail.com';

@Injectable()
export class ResendMailService implements IMailService {
  private readonly logger = new Logger(ResendMailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;
  private readonly isDevelopment: boolean;

  constructor(configService: ConfigService) {
    this.resend = new Resend(configService.get<string>('RESEND_API_KEY'));
    this.fromEmail = configService.get<string>('RESEND_FROM_EMAIL') ?? '';
    this.frontendUrl = configService.get<string>('FRONTEND_URL') ?? '';
    const nodeEnv = configService.get<string>('NODE_ENV');
    this.isDevelopment = nodeEnv === 'DEV';
  }

  async sendBarberInviteEmail(
    params: SendBarberInviteEmailParams,
  ): Promise<void> {
    const acceptUrl = `${this.frontendUrl}/convite-barbeiro?token=${params.token}`;
    const to = this.resolveRecipient(params.to);

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Você foi convidado para se tornar um barbeiro',
      html: `
        <p>Olá, ${params.name}!</p>
        <p>Você foi convidado para fazer parte da equipe de barbeiros. Clique no link abaixo para aceitar o convite e ativar sua conta:</p>
        <p><a href="${acceptUrl}">${acceptUrl}</a></p>
        <p>Se você não esperava este convite, pode ignorar este e-mail.</p>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send barber invite email: ${error.message}`);
      throw new InternalServerErrorException(
        'Não foi possível enviar o e-mail de convite.',
      );
    }
  }

  private resolveRecipient(to: string): string {
    if (!this.isDevelopment || to === DEV_RECIPIENT_OVERRIDE) {
      return to;
    }

    this.logger.warn(
      `Development environment — redirecting email from ${to} to ${DEV_RECIPIENT_OVERRIDE}`,
    );
    return DEV_RECIPIENT_OVERRIDE;
  }
}
