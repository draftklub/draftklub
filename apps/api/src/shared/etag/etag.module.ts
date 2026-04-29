import { Global, Module } from '@nestjs/common';
import { EtagInterceptor } from './etag.interceptor';

@Global()
@Module({
  providers: [EtagInterceptor],
  exports: [EtagInterceptor],
})
export class EtagModule {}
