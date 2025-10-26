import { TokenType } from "../dtos/create-token-dto";
import { RecoveryPasswordDTO } from "../dtos/recovery-password-dto";
import { TokensRepository } from "../repositories/tokens.repository";
import { UsersRepository } from "../repositories/users.repository"
import { MailService } from "@/lib/mail";
import { pretty, render } from "@react-email/components";
import DropboxResetPasswordEmail from "@/emails/ForgotPasswordEmail";
import { env } from "@/config/env";
import { Token } from "../dtos/tokens";
import { NotFoundError } from "@/errors/app-error";
import { logger } from "@/lib/logger";

export class ForgotPasswordUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private tokensRepository: TokensRepository
  ) {}

  async execute({
    email,
  }: RecoveryPasswordDTO): Promise<Token> {
    logger.info({ email }, "Password recovery requested")

    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      logger.warn({ email }, "Password recovery failed: user not found")
      throw new NotFoundError("Invalid credentials.")
    }

    const token = await this.tokensRepository.create({
      type: TokenType.PASSWORD_RECOVERY,
      userId: user.id
    })

    const recoveryLink = `${env.FRONTEND_URL}/reset-password?token=${token.token}`

    const mailClient = new MailService()

    const html = await pretty(await render(DropboxResetPasswordEmail({
      userFirstname: user.name,
      resetPasswordLink: recoveryLink
    })))

    mailClient.sendMail({
      to: user.email,
      subject: "Recovery password",
      html: html
    })

    logger.info({ email, userId: user.id }, "Password recovery email sent")

    return token;
  }
}