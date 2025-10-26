import { CreateUserLoginDTO } from "../dtos/create-user-login-dto"
import { UserLogin } from "../dtos/user-login"

export interface UserLoginRepository {
  findByCode(code: string): Promise<UserLogin | null>
  findById(id: string): Promise<UserLogin | null>
  findByUserId(id: string): Promise<UserLogin | null>
  create(data: CreateUserLoginDTO): Promise<UserLogin>
  update(data: Partial<UserLogin>): Promise<UserLogin>
}
