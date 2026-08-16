export interface JwtPayload {
  sub: string;
  role: string;
  barberId: string | null;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
}

export abstract class ITokenService {
  abstract signAccessToken(payload: JwtPayload): string;
  abstract signRefreshToken(payload: RefreshTokenPayload): string;
  abstract verifyRefreshToken(token: string): RefreshTokenPayload;
}
