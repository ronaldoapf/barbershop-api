import { UsersRepository } from "@/modules/users/repositories/users.repository";
import { PasswordEncrypter } from "@/lib/password-encrypter";
import { AuthWithPasswordDTO } from "../dtos/authenticate-with-password-dto";

export class AuthenticateWithPasswordUseCase {
  constructor(private usersRepository: UsersRepository) {}

  async execute({ 
    email,
    password
  }: AuthWithPasswordDTO) {
    const checkIfUserExists = await this.usersRepository.findByEmail(email)

    if (!checkIfUserExists) {
      throw new Error("Invalid credentials.")
    }
  
    const passwordEncrypter = new PasswordEncrypter()

    const doesPasswordMatch = await passwordEncrypter.compare(password, checkIfUserExists.password)
  
    if(!doesPasswordMatch) {
      throw new Error("Invalid credentials.")
    }
      
    return checkIfUserExists
  }

  // TODO: Generate JWT and return to user
}