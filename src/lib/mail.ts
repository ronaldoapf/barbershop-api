import nodemailer from "nodemailer"
import { env } from "../config/env";
import { MailtrapTransport } from "mailtrap";

interface SendMailProps {
  to: string;
  html?: string;
  text?: string;
  subject: string;
}

export class MailService {
  private TOKEN = env.MAILTRAP_API_KEY;

  private async getClient() {

    const mailClient = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      auth: {
        user: 'resend',
        pass: env.RESEND_API_KEY,
      },
    })

    return mailClient;

  }

  async sendMail({ to, text, html, subject }: SendMailProps) {
    const mailClient = await this.getClient();

    await mailClient.sendMail({
      from: 'Acme <onboarding@resend.dev>',
      to,
      text,
      html,
      subject,
    })
  }
}