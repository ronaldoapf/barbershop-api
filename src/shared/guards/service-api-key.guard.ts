import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const providedKey = request.headers['x-api-key'];
    const expectedKey = this.configService.get<string>(
      'WHATSAPP_SERVICE_API_KEY',
    );

    if (!expectedKey || !providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('Chave de API de serviço inválida.');
    }

    return true;
  }
}
