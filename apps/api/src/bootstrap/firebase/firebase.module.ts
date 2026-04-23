import { Module, Global, OnApplicationBootstrap, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global()
@Module({})
export class FirebaseModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(FirebaseModule.name);

  onApplicationBootstrap(): void {
    if (admin.apps.length > 0) return;
    admin.initializeApp();
    this.logger.log('Firebase Admin SDK initialized via ADC');
  }
}
