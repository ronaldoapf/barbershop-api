import { UsersRepository } from "@/modules/users/repositories/users.repository";
import { AuthenticateWithCodeDTO } from "../dtos/authenticate-with-code-dto";
import { UserLoginRepository } from "../repositories/user-login.repository";
import { isAfter } from "date-fns";
import { UnauthorizedError } from "@/errors/app-error";
import { User } from "@/modules/users/dtos/users";
import { logger } from "@/lib/logger";

export class AuthenticateWithCodeUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private userLoginRepository: UserLoginRepository
  ) { }

  async execute({
    code,
    email,
  }: AuthenticateWithCodeDTO): Promise<User> {
    logger.info({ email }, "Code authentication attempt")

    const getUser = await this.usersRepository.findByEmail(email)

    if (!getUser) {
      logger.warn({ email }, "Authentication failed: user not found")
      throw new UnauthorizedError("Invalid credentials.")
    }

    const getCode = await this.userLoginRepository.findByUserId(getUser.id)

    if (!getCode) {
      logger.warn({ email, userId: getUser.id }, "Authentication failed: no code found")
      throw new UnauthorizedError("Invalid code.")
    }

    const isTokenExpiredOrNotValid = isAfter(new Date(), getCode.expiresAt) || getCode.code !== code || !getCode.isValid

    if (isTokenExpiredOrNotValid) {
      logger.warn({ email, userId: getUser.id }, "Authentication failed: invalid or expired code")
      throw new UnauthorizedError("This token has expired.")
    }

    await this.userLoginRepository.update({
      id: getCode.id,
      isValid: false,
      code: getCode.code,
    })

    logger.info({ email, userId: getUser.id }, "Code authentication successful")

    return getUser
  }
}