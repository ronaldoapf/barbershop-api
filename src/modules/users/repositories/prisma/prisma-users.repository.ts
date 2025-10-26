import { User } from "../../dtos/users"
import { UsersRepository } from "../users.repository"
import { CreateUserDTO } from "../../dtos/create-user-dto"
import { prisma } from "@/config/prisma"

export class PrismaUsersRepository implements UsersRepository {
  async update(data: Partial<User>): Promise<User | null> {

    const { id } = data

    const user = await prisma.user.update({
      where: { id },
      data
    })

    return user
  }
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    })
    if (!user) return null;
    return {
      ...user,
      isEmailVerified: user.isEmailVerified,
    }
  }

  async create(data: CreateUserDTO): Promise<User> {
    const user = await prisma.user.create({
      data
    })

    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    return user
  }


}