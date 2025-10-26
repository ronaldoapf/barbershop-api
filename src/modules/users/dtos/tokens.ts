import { TokenType } from "@prisma/client";

export interface Token {
  id: string;
  token: string;
  userId: string;
  type: TokenType;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  hasBeenValidated: boolean;
}