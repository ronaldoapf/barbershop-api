import { PasswordEncrypter } from "@/lib/password-encrypter";
import { CreateUserDTO } from "../dtos/create-user-dto"
import { UsersRepository } from "../repositories/users.repository"
import { MailService } from "@/lib/mail";
import { TokensRepository } from "../repositories/tokens.repository";
import { TokenType } from "../dtos/create-token-dto";
import { ConflictError } from "@/errors/app-error";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export class CreateUserUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private tokensRepository: TokensRepository
  ) { }

  async execute({
    name,
    email,
    password
  }: CreateUserDTO) {
    logger.info({ email }, "Creating new user")

    const userWithSameEmail = await this.usersRepository.findByEmail(email)

    if (userWithSameEmail) {
      logger.warn({ email }, "User creation failed: email already exists")
      throw new ConflictError("User with same email already exists.")
    }

    const passwordEncrypter = new PasswordEncrypter();

    const hashedPassword = await passwordEncrypter.encrypt(password)

    const user = await this.usersRepository.create({
      name,
      email,
      password: hashedPassword
    })

    logger.info({ userId: user.id, email: user.email }, "User created successfully")

    const { token } = await this.tokensRepository.create({
      type: TokenType.EMAIL_VERIFICATION,
      userId: user.id
    })

    const mailService = new MailService();

    const verifyEmailUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`

    mailService.sendMail({
      subject: "Welcome to our platform!",
      to: email,
      html: `
        <div>
          <h1>Hello, ${name}!</h1>
          <p>Thank you for registering on our platform.</p>
          <p>We're excited to have you on board!</p>
          <a href="${verifyEmailUrl}">Verify your email</a>
        </div>
      `
    })

    logger.debug({ userId: user.id }, "Verification email sent")

    return user
  }
}