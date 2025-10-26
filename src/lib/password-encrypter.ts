import { compare, hash } from 'bcryptjs';

export class PasswordEncrypter {
  private HASH_ROUNDS = 8;

  async encrypt(password: string): Promise<string> {
    return await hash(password, this.HASH_ROUNDS);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await compare(password, hashedPassword);
  }
}