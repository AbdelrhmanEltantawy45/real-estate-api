import { Injectable, Logger } from '@nestjs/common';
import { StorageDriver, StorageResult, UploadableFile } from '../storage.interface';

/**
 * Cloudinary storage driver (scaffold). To enable it, set
 * STORAGE_DRIVER=cloudinary, provide CLOUDINARY_* credentials, install the
 * `cloudinary` package, and implement the upload using its uploader API.
 */
@Injectable()
export class CloudinaryStorageDriver implements StorageDriver {
  private readonly logger = new Logger(CloudinaryStorageDriver.name);

  async upload(_file: UploadableFile, _storageKey: string): Promise<StorageResult> {
    throw new Error(
      'Cloudinary driver is a scaffold. Install the cloudinary package and implement the upload call.',
    );
  }

  async delete(_storageKey: string): Promise<void> {
    this.logger.warn('Cloudinary delete called but driver is not implemented');
  }
}
