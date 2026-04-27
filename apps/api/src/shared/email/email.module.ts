import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Email module — disponibiliza EmailService globalmente. Sem
 * RESEND_API_KEY configurado, opera em modo log-only (não envia
 * emails reais; útil pra dev e CI).
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
