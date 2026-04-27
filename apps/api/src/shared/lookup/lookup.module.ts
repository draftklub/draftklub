import { Global, Module } from '@nestjs/common';
import { CnpjLookupService } from './cnpj-lookup.service';

/**
 * Lookup module — disponibiliza CnpjLookupService globalmente
 * (BrasilAPI consulta de CNPJ pra autopreencher endereço + status
 * cadastral no /criar-klub).
 *
 * Pattern espelha o GeocodingModule (CEP→lat/lng).
 */
@Global()
@Module({
  providers: [CnpjLookupService],
  exports: [CnpjLookupService],
})
export class LookupModule {}
