import { TokensRepository } from "../repositories/tokens.repository";
import { UsersRepository } from "../repositories/users.repository"
import { isBefore } from "date-fns";
import { ResendUserEmailValidationDTO } from "../dtos/resend-user-email-validation-dto";
import { MailService } from "@/lib/mail";
import { TokenType } from "../dtos/create-token-dto";
import { templateUrl } from "@/utils/template-url";
import { templateValidateEmail } from "@/utils/template-validate-email";
import { NotFoundError } from "@/errors/app-error";
import { env } from "@/config/env";


export class ResendUserEmailValidationUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private tokensRepository: TokensRepository
  ) { }


  async execute({ email }: ResendUserEmailValidationDTO): Promise<void> {
    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      throw new NotFoundError("User not found.")
    }

    const getToken = await this.tokensRepository.findByUserId(user.id)

    const mailService = new MailService();

    const isValidToken = getToken && getToken.hasBeenValidated === false && isBefore(new Date(), getToken?.expiresAt)

    if (isValidToken) {
      mailService.sendMail({
        subject: "Verify your email to our platform!",
        to: email,
        html: templateValidateEmail(user.name, templateUrl(env.FRONTEND_URL, `verify-email?token=${getToken?.token}`))
      })
      return
    }

    const newToken = await this.tokensRepository.create({
      type: TokenType.EMAIL_VERIFICATION,
      userId: user.id
    })

    mailService.sendMail({
      subject: "Verify your email to our platform!",
      to: email,
      html: templateValidateEmail(user.name, templateUrl(env.FRONTEND_URL, `verify-email?token=${newToken?.token}`))
    })
  }
}