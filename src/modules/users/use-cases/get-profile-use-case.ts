import { UserProfile } from "../dtos/users"
import { UsersRepository } from "../repositories/users.repository"

export class GetProfileUseCase {
  constructor(private usersRepository: UsersRepository) { }

  async execute({ id }: { id: string }): Promise<UserProfile> {
    const user = await this.usersRepository.findById(id)

    if (!user) {
      throw new Error("User not found.")
    }

    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    return userWithoutPassword
  }
}