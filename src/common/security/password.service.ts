import { Injectable, Logger } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';

/**
 * Password hashing service backed by Argon2id (@node-rs/argon2 ships prebuilt
 * binaries, so no native compilation is required).
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  async hash(plain: string): Promise<string> {
    return hash(plain, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch (error) {
      this.logger.debug(`Password verification failed: ${(error as Error).message}`);
      return false;
    }
  }
}
