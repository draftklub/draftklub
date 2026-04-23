import { Module, Global } from '@nestjs/common';
import { PolicyEngine } from './policy.engine';
import { PolicyGuard } from './policy.guard';

@Global()
@Module({
  providers: [PolicyEngine, PolicyGuard],
  exports: [PolicyEngine, PolicyGuard],
})
export class AuthModule {}
