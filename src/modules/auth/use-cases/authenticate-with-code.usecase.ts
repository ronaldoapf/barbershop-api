import { UsersRepository } from "@/modules/users/repositories/users.repository";
import { AuthenticateWithCodeDTO } from "../dtos/authenticate-with-code-dto";
import { UserLoginRepository } from "../repositories/user-login.repository";
import { isAfter } from "date-fns";

export class AuthenticateWithCodeUseCase {
  constructor(
    private usersRepository: UsersRepository,
    private userLoginRepository: UserLoginRepository
  ) { }

  async execute({
    code,
    email,
  }: AuthenticateWithCodeDTO): Promise<void> {
    const getUser = await this.usersRepository.findByEmail(email)

    if (!getUser) {
      throw new Error("Invalid credentials.")
    }

    const getCode = await this.userLoginRepository.findByUserId(getUser.id)

    if (!getCode) {
      throw new Error("Invalid code.")
    }

    const isTokenExpiredOrNotValid = isAfter(new Date(), getCode.expiresAt) || getCode.code !== code || !getCode.isValid

    if (isTokenExpiredOrNotValid) {
      throw new Error("This token has expired.")
    }

    await this.userLoginRepository.update({
      id: getCode.id,
      isValid: false,
      code: getCode.code,
    })

    // TODO: Generate JWT and return to user
  }
}