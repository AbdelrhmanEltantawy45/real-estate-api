import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/config/app-config.service';
import { StorageDriver, StorageResult, UploadableFile } from '../storage.interface';

/**
 * Amazon S3 storage driver.
 *
 * To enable it, set STORAGE_DRIVER=s3 and provide the S3_* credentials, then
 * install an AWS SDK client, for example:
 *   npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
 * and replace the TODO below with a real PutObject call. The interface is
 * intentionally stable so wiring a provider does not touch any other module.
 */
@Injectable()
export class S3StorageDriver implements StorageDriver {
  private readonly logger = new Logger(S3StorageDriver.name);

  constructor(private readonly config: AppConfigService) {}

  async upload(_file: UploadableFile, storageKey: string): Promise<StorageResult> {
    const { bucket, region } = this.config.storage.s3;
    if (!bucket) {
      throw new Error('S3 storage is not configured. Set S3_BUCKET and credentials.');
    }
    // TODO: implement with @aws-sdk/client-s3 PutObjectCommand.
    void region;
    void storageKey;
    throw new Error(
      'S3 driver is a scaffold. Install @aws-sdk/client-s3 and implement the upload call.',
    );
  }

  async delete(_storageKey: string): Promise<void> {
    this.logger.warn('S3 delete called but driver is not implemented');
  }
}
