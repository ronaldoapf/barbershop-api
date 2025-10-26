import { TokenType } from "../dtos/create-token-dto";
import { RecoveryPasswordDTO } from "../dtos/recovery-password-dto";
import { TokensRepository } from "../repositories/tokens.repository";
import { UsersRepository } from "../repositories/users.repository"
import { MailService } from "@/lib/mail";
import { pretty, render } from "@react-email/components";
import DropboxResetPasswordEmail from "@/emails/ForgotPasswordEmail";
import { env } from "@/config/env";
import { Token } from "../dtos/tokens";

export class ForgotPasswordUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private tokensRepository: TokensRepository
  ) {}

  async execute({ 
    email, 
  }: RecoveryPasswordDTO): Promise<Token> {
    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      throw new Error("Invalid credetnais")
    }

    const token = await this.tokensRepository.create({
      type: TokenType.PASSWORD_RECOVERY,
      userId: user.id
    })

    const recoveryLink = `http://localhost:5173/reset-password?token=${token.token}`

    const mailClient = new MailService()

    const html = await pretty(await render(DropboxResetPasswordEmail({
      userFirstname: user.name,
      resetPasswordLink: recoveryLink
    })))

    mailClient.sendMail({
      to: env.NODE_ENV === "development" ? "ronaldo.alves.1997@gmail.com" : user.email,
      subject: "Recovery password",
      html: html
    })
    
    return token;
  }
}