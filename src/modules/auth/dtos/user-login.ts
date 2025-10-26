export interface UserLogin {
  id: string
  code: string
  userId: string
  expiresAt: Date
  isValid: boolean
  createdAt: Date
  updatedAt: Date
}
