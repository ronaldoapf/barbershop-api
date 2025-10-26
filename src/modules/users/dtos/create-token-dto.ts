export enum TokenType {
  PASSWORD_RECOVERY = "PASSWORD_RECOVERY",
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION"
}

export interface CreateTokenDTO {
  type: TokenType;
  userId: string
}