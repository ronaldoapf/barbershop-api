import { TokensRepository } from "../repositories/tokens.repository";
import { UsersRepository } from "../repositories/users.repository"
import { isAfter } from "date-fns";
import { ValidateUserEmailDTO } from "../dtos/validate-user-email-dto";
import { TokenType } from "../dtos/create-token-dto";
import { NotFoundError, UnauthorizedError } from "@/errors/app-error";
import { logger } from "@/lib/logger";

export class ValidateUserEmailUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private tokensRepository: TokensRepository
  ) { }

  async execute({
    email,
    token
  }: ValidateUserEmailDTO): Promise<void> {
    logger.info({ email }, "Email validation attempt")

    const getToken = await this.tokensRepository.findByToken(token)

    if (getToken?.hasBeenValidated) {
      logger.debug({ email }, "Email already validated")
      return
    }

    const tokenIsNotValid = !getToken || isAfter(new Date(), getToken.expiresAt) || getToken.type !== TokenType.EMAIL_VERIFICATION

    if (tokenIsNotValid) {
      logger.warn({ email }, "Email validation failed: invalid token")
      throw new UnauthorizedError("This token is not valid.")
    }

    const getUser = await this.usersRepository.findById(getToken.userId)

    if (!getUser) {
      logger.warn({ email }, "Email validation failed: user not found")
      throw new NotFoundError("User not found.")
    }

    if (getUser.isEmailVerified) {
      logger.debug({ email, userId: getUser.id }, "User email already verified")
      return
    }

    if (getUser.email !== email) {
      logger.warn({ email, userId: getUser.id }, "Email validation failed: email mismatch")
      throw new UnauthorizedError("This token does not belong to this email.")
    }

    await this.usersRepository.update({
      id: getUser.id,
      isEmailVerified: true
    })

    await this.tokensRepository.update({
      id: getToken.id,
      hasBeenValidated: true,
    })

    logger.info({ email, userId: getUser.id }, "Email validated successfully")
  }
}