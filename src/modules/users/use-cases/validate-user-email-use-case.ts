import { PasswordEncrypter } from "@/lib/password-encrypter";
import { TokensRepository } from "../repositories/tokens.repository";
import { UsersRepository } from "../repositories/users.repository"
import { isAfter } from "date-fns";
import { ValidateUserEmailDTO } from "../dtos/validate-user-email-dto";
import { TokenType } from "../dtos/create-token-dto";

export class ValidateUserEmailUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private tokensRepository: TokensRepository
  ) { }

  async execute({
    email,
    token
  }: ValidateUserEmailDTO): Promise<void> {

    const getToken = await this.tokensRepository.findByToken(token)

    if (getToken?.hasBeenValidated) {
      return
    }

    const tokenIsNotValid = !getToken || isAfter(new Date(), getToken.expiresAt) || getToken.type !== TokenType.EMAIL_VERIFICATION

    if (tokenIsNotValid) {
      throw new Error("This token is not valid.")
    }

    const getUser = await this.usersRepository.findById(getToken.userId)

    if (!getUser) {
      throw new Error("User not found.")
    }

    if (getUser.isEmailVerified) {
      return
    }

    if (getUser.email !== email) {
      throw new Error("This token does not belong to this email.")
    }

    await this.usersRepository.update({
      id: getUser.id,
      isEmailVerified: true
    })

    await this.tokensRepository.update({
      id: getToken.id,
      hasBeenValidated: true,
    })
  }
}