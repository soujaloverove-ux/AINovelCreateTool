import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM 加密服务
 *
 * 用于加密存储 API Key 等敏感信息
 *
 * 加密输出格式: base64(iv):base64(authTag):base64(ciphertext)
 * - iv: 16 bytes 随机初始化向量
 * - authTag: 16 bytes GCM 认证标签
 * - ciphertext: 加密后的密文
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly ivLength = 16;
  private readonly authTagLength = 16;

  constructor(private readonly configService: ConfigService) {
    const masterKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (!masterKey) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY is not set. Generate one with: openssl rand -hex 32',
      );
    }

    // 验证密钥长度 (64 hex chars = 32 bytes for AES-256)
    if (masterKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(masterKey)) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32',
      );
    }

    this.key = Buffer.from(masterKey, 'hex');
  }

  /**
   * 加密明文
   * @param plainText 待加密的明文
   * @returns 加密后的字符串，格式: base64(iv):base64(authTag):base64(ciphertext)
   */
  encrypt(plainText: string): string {
    if (!plainText) {
      return '';
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
      authTagLength: this.authTagLength,
    });

    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // 拼接格式: iv:authTag:encrypted
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted,
    ].join(':');
  }

  /**
   * 解密文本
   * @param encryptedText 加密后的字符串，格式: base64(iv):base64(authTag):base64(ciphertext)
   * @returns 解密后的明文
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      return '';
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format. Expected: iv:authTag:ciphertext');
    }

    const [ivB64, authTagB64, encrypted] = parts;

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv, {
      authTagLength: this.authTagLength,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 生成新的主密钥 (用于首次配置)
   * @returns 64位十六进制字符串 (32 bytes)
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
