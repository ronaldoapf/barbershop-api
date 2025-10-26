import { CreateTokenDTO } from "../dtos/create-token-dto"
import { Token } from "../dtos/tokens"

export interface TokensRepository {
  findByUserId(userId: string): Promise<Token | null>
  findByToken(token: string): Promise<Token | null>
  create(data: CreateTokenDTO): Promise<Token>
  update(data: Partial<Token>): Promise<Token>
}