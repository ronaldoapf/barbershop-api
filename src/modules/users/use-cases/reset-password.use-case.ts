import { PasswordEncrypter } from "@/lib/password-encrypter";
import { ResetPasswordDTO } from "../dtos/reset-password-dto";
import { TokensRepository } from "../repositories/tokens.repository";
import { UsersRepository } from "../repositories/users.repository"
import { isAfter } from "date-fns";

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
    const getToken = await this.tokensRepository.findByToken(token)

    if(!getToken) {
      throw new Error("This token is not valid.")
    }

    const { expiresAt } = getToken

    const isTokenExpired = isAfter(new Date(), expiresAt)

    if (isTokenExpired) {
      throw new Error("This token has expired.")
    }

    if(newPassword !== confirmPassword) {
      throw new Error("Password does not match.")
    }

    const passwordEncrypter = new PasswordEncrypter()

    const passwordHashed = await passwordEncrypter.encrypt(newPassword)

    await this.usersRepository.update({
      id: getToken.userId,
      password: passwordHashed
    })
  }
}