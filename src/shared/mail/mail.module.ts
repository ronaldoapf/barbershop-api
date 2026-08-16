import { Global, Module } from '@nestjs/common';
import { IMailService } from './mail.service';
import { ResendMailService } from './resend-mail.service';

@Global()
@Module({
  providers: [{ provide: IMailService, useClass: ResendMailService }],
  exports: [IMailService],
})
export class MailModule {}
