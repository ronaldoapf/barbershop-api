export interface CreateUserLoginDTO {
  code: string
  userId: string
  expiresAt?: Date
  isValid?: boolean
}
