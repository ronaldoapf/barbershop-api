import { PasswordEncrypter } from "@/lib/password-encrypter";
import { ResetPasswordDTO } from "../dtos/reset-password-dto";
import { TokensRepository } from "../repositories/tokens.repository";
import { UsersRepository } from "../repositories/users.repository"
import { isAfter } from "date-fns";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/errors/app-error";
import { logger } from "@/lib/logger";

export class ResetPasswordUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private tokensRepository: TokensRepository
  ) {}

  async execute({
    token,
    newPassword,
    confirmPassword,
  }: ResetPasswordDTO): Promise<void> {
    logger.info("Password reset attempt")

    const getToken = await this.tokensRepository.findByToken(token)

    if(!getToken) {
      logger.warn("Password reset failed: invalid token")
      throw new NotFoundError("This token is not valid.")
    }

    const { expiresAt } = getToken

    const isTokenExpired = isAfter(new Date(), expiresAt)

    if (isTokenExpired) {
      logger.warn({ userId: getToken.userId }, "Password reset failed: token expired")
      throw new UnauthorizedError("This token has expired.")
    }

    if(newPassword !== confirmPassword) {
      logger.warn({ userId: getToken.userId }, "Password reset failed: passwords do not match")
      throw new BadRequestError("Password does not match.")
    }

    const passwordEncrypter = new PasswordEncrypter()

    const passwordHashed = await passwordEncrypter.encrypt(newPassword)

    await this.usersRepository.update({
      id: getToken.userId,
      password: passwordHashed
    })

    logger.info({ userId: getToken.userId }, "Password reset successful")
  }
}