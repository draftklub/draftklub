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

  /**
   * Sprint M batch 8 — pack encrypted+iv num único string pra storage
   * em coluna text simples. Formato: `enc:v1:{iv_hex}:{ciphertext_b64}`.
   * Prefixo `enc:v1:` permite distinguir de plaintext legado e suporta
   * versionamento futuro do esquema sem migration destrutiva.
   *
   * Pra valores nulos/vazios, retorna o input sem tocar.
   */
  encryptToString(plain: string | null | undefined): string | null {
    if (plain == null || plain === '') return plain ?? null;
    const { encrypted, iv } = this.encrypt(plain);
    return `enc:v1:${iv}:${encrypted}`;
  }

  /**
   * Inverso de encryptToString. Detecta plaintext legado pelo prefixo
   * ausente e retorna como veio (gradual migration: re-saves criptografam).
   * Falha de decrypt (auth tag mismatch, corrompido) loga warning e
   * retorna o input original — não quebra a request por causa de 1 linha.
   */
  decryptFromString(stored: string | null | undefined): string | null {
    if (stored == null || stored === '') return stored ?? null;
    if (!stored.startsWith('enc:v1:')) return stored;
    const parts = stored.split(':');
    // 'enc' | 'v1' | iv_hex | ciphertext_b64 (b64 não tem `:`)
    if (parts.length !== 4) {
      this.logger.warn(`Malformed encrypted value (parts=${parts.length})`);
      return stored;
    }
    const iv = parts[2];
    const ciphertext = parts[3];
    if (!iv || !ciphertext) return stored;
    try {
      return this.decrypt(ciphertext, iv);
    } catch (err) {
      this.logger.warn(`Decryption failed: ${err instanceof Error ? err.message : String(err)}`);
      return stored;
    }
  }
}
