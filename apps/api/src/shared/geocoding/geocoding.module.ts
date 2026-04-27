import { Global, Module } from '@nestjs/common';
import { CepGeocoderService } from './cep-geocoder.service';

/**
 * Geocoding module — disponibiliza CepGeocoderService globalmente
 * sem precisar import manual em cada módulo consumer.
 */
@Global()
@Module({
  providers: [CepGeocoderService],
  exports: [CepGeocoderService],
})
export class GeocodingModule {}
