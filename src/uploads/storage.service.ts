import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { AppConfigService } from '@/config/app-config.service';
import { StorageDriver, StorageResult, UploadableFile } from './storage.interface';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import { CloudinaryStorageDriver } from './drivers/cloudinary-storage.driver';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;

  constructor(private readonly config: AppConfigService) {
    switch (config.storage.driver) {
      case 's3':
        this.driver = new S3StorageDriver(config);
        break;
      case 'cloudinary':
        this.driver = new CloudinaryStorageDriver();
        break;
      case 'local':
      default:
        this.driver = new LocalStorageDriver(config);
        break;
    }
  }

  onModuleInit() {
    this.logger.log(`Storage driver: ${this.config.storage.driver}`);
  }

  async uploadImage(file: UploadableFile, keyPrefix = 'properties'): Promise<StorageResult> {
    this.validate(file);
    const ext = extname(file.originalname).toLowerCase();
    const ym = new Date().toISOString().slice(0, 7); // YYYY-MM
    const storageKey = `${keyPrefix}/${ym}/${randomUUID()}${ext}`;
    return this.driver.upload(file, storageKey);
  }

  delete(storageKey: string): Promise<void> {
    return this.driver.delete(storageKey);
  }

  private validate(file: UploadableFile): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('Image file is required');
    }
    const maxSize = this.config.storage.maxUploadSizeBytes;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${maxSize} bytes`,
      );
    }
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new BadRequestException(
        `Unsupported file type ${ext}. Allowed: ${[...ALLOWED_EXT].join(', ')}`,
      );
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported MIME type ${file.mimetype}. Allowed: ${[...ALLOWED_MIME].join(', ')}`,
      );
    }
  }
}
