import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BcryptService {
  private readonly saltRounds: number;

  constructor(configService: ConfigService) {
    const configured = configService.get<string>('BCRYPT_SALT_ROUNDS');
    this.saltRounds = configured ? Number(configured) : 10;
  }

  async encrypt(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.saltRounds);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
