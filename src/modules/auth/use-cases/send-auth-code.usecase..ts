import { UsersRepository } from "@/modules/users/repositories/users.repository";
import { MailService } from "@/lib/mail";
import { SendAuthCodeDTO } from "../dtos/send-auth-code-dto";
import { UserLoginRepository } from "../repositories/user-login.repository";
import { render } from "@react-email/components";
import { LoginCodeEmail } from "@/emails/LoginCodeEmail";
import { env } from "@/config/env";

export class SendAuthCodeUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private userLoginRepository: UserLoginRepository
  ) {}

  async execute({ 
    email,
  }: SendAuthCodeDTO): Promise<void> {
    const checkIfUserExists = await this.usersRepository.findByEmail(email)

    if (!checkIfUserExists) {
      return
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))

    const userLoginCode = await this.userLoginRepository.create({
      code,
      userId: checkIfUserExists.id,
    })

    const html = await render(LoginCodeEmail({ validationCode: userLoginCode.code }))

    const mail = new MailService()

    mail.sendMail({
      to: checkIfUserExists.email,
      subject: "Your authentication code",
      html,
    })
  }
}