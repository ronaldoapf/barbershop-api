import { UsersRepository } from "@/modules/users/repositories/users.repository";
import { PasswordEncrypter } from "@/lib/password-encrypter";
import { AuthWithPasswordDTO } from "../dtos/authenticate-with-password-dto";
import { UnauthorizedError } from "@/errors/app-error";
import { logger } from "@/lib/logger";

export class AuthenticateWithPasswordUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({
    email,
    password
  }: AuthWithPasswordDTO) {
    logger.info({ email }, "Password authentication attempt")

    const checkIfUserExists = await this.usersRepository.findByEmail(email)

    if (!checkIfUserExists) {
      logger.warn({ email }, "Authentication failed: user not found")
      throw new UnauthorizedError("Invalid credentials.")
    }

    const passwordEncrypter = new PasswordEncrypter()

    const doesPasswordMatch = await passwordEncrypter.compare(password, checkIfUserExists.password)

    if(!doesPasswordMatch) {
      logger.warn({ email, userId: checkIfUserExists.id }, "Authentication failed: invalid password")
      throw new UnauthorizedError("Invalid credentials.")
    }

    logger.info({ email, userId: checkIfUserExists.id }, "Authentication successful")

    return checkIfUserExists
  }
}