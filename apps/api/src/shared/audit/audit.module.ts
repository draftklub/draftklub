import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from './audit.service';

/**
 * Module global pra que qualquer handler possa injetar AuditService sem
 * precisar importar AuditModule explicitamente. Padrão consistente com
 * EncryptionModule e GeocodingModule.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
