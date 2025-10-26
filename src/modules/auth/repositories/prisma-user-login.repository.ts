import { prisma } from "@/config/prisma"
import { UserLoginRepository } from "./user-login.repository"
import { UserLogin } from "../dtos/user-login"
import { CreateUserLoginDTO } from "../dtos/create-user-login-dto"
import { addMinutes } from "date-fns"

export class PrismaUserLoginRepository implements UserLoginRepository {
  async findByCode(code: string): Promise<UserLogin | null> {
    const userLogin = await prisma.userLogin.findUnique({ where: { code } })

    return userLogin
  }

  async findById(id: string): Promise<UserLogin | null> {
    const userLogin = await prisma.userLogin.findUnique({ where: { id } })

    return userLogin
  }

  async findByUserId(id: string): Promise<UserLogin | null> {
    const userLogin = await prisma.userLogin.findFirst({
      where: {
        userId: id
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return userLogin
  }

  async create(data: CreateUserLoginDTO): Promise<UserLogin> {
    const codeExpiresAt = addMinutes(new Date(), 10)

    const userLogin = await prisma.userLogin.create({
      data: {
        code: data.code,
        userId: data.userId,
        expiresAt: codeExpiresAt,
      },
    })

    return userLogin
  }

  async update(data: Partial<UserLogin>): Promise<UserLogin> {
    const userLogin = await prisma.userLogin.update({
      where: { id: data.id },
      data: {
        code: data.code,
        userId: data.userId,
        expiresAt: data.expiresAt,
        isValid: data.isValid,
      },
    })
    return userLogin
  }
}
