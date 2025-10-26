import { User } from "../dtos/users"
import { CreateUserDTO } from "../dtos/create-user-dto"

export interface UsersRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  create(data: CreateUserDTO): Promise<User>
  update(data: Partial<User>): Promise<User | null>
}