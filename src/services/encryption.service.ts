import { BadRequestException, Injectable } from '@nestjs/common';
import CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  constructor(private readonly secretKey: string) {}

  encrypt(data: unknown): string {
    try {
      const textToEncrypt = JSON.stringify(data);
      return CryptoJS.AES.encrypt(textToEncrypt, this.secretKey).toString();
    } catch {
      throw new BadRequestException('Invalid Encryption data');
    }
  }

  decrypt(encryptedText: string): unknown {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(
        encryptedText,
        this.secretKey,
      );
      const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedText);
    } catch {
      throw new BadRequestException('Invalid Encryption data');
    }
  }
}
