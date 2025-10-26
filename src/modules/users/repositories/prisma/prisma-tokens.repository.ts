import { prisma } from "@/config/prisma";
import { TokensRepository } from "../tokens.repository";
import { CreateTokenDTO } from "../../dtos/create-token-dto";
import { Token } from "../../dtos/tokens";

export class PrismaTokensRepository implements TokensRepository {
  async findByUserId(userId: string): Promise<Token | null> {
    const currentToken = await prisma.token.findFirst({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return currentToken;
  }

  async findByToken(token: string): Promise<Token | null> {
    const currentToken = await prisma.token.findUnique({
      where: { token }
    })

    return currentToken;
  }

  async create({ type, userId }: CreateTokenDTO): Promise<Token> {
    const newToken = await prisma.token.create({
      data: {
        type,
        userId,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
      }
    })

    return newToken;
  }

  async update(data: Token): Promise<Token> {
    const { id } = data

    const token = await prisma.token.update({
      where: { id },
      data
    })

    return token;
  }
}