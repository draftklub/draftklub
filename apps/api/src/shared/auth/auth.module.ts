import { Module, Global } from '@nestjs/common';
import { PolicyEngine } from './policy.engine';
import { PolicyGuard } from './policy.guard';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@Global()
@Module({
  providers: [PolicyEngine, PolicyGuard, FirebaseAuthGuard],
  exports: [PolicyEngine, PolicyGuard, FirebaseAuthGuard],
})
export class AuthModule {}
