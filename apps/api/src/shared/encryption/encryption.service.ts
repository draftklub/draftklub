import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { AppConfig } from '../../bootstrap/config/app.config';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly config: ConfigService<AppConfig>) {}

  private getKey(): Buffer {
    const keyHex = this.config.get('ENCRYPTION_KEY', { infer: true });
    if (!keyHex) {
      const env = process.env.NODE_ENV ?? 'development';
      if (env === 'production') {
        throw new Error(
          'ENCRYPTION_KEY missing in production — refusing to encrypt with dev fallback key',
        );
      }
      this.logger.warn('ENCRYPTION_KEY not set — using dev fallback key (NODE_ENV=' + env + ')');
      return Buffer.from('0'.repeat(64), 'hex');
    }
    return Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): { encrypted: string; iv: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      encrypted: Buffer.concat([encrypted, authTag]).toString('base64'),
      iv: iv.toString('hex'),
    };
  }

  decrypt(encrypted: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(encrypted, 'base64');
    const authTag = data.subarray(data.length - 16);
    const ciphertext = data.subarray(0, data.length - 16);
    const decipher = createDecipheriv(this.algorithm, this.getKey(), iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  }
}
