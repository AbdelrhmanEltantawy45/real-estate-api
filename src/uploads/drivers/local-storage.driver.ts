import { Injectable, Logger } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { AppConfigService } from '@/config/app-config.service';
import { StorageDriver, StorageResult, UploadableFile } from '../storage.interface';

/**
 * Local filesystem storage driver. Files are written to LOCAL_UPLOAD_DIR and
 * served by the static asset middleware mounted at /uploads/. This is the
 * default for local development.
 */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly logger = new Logger(LocalStorageDriver.name);

  constructor(private readonly config: AppConfigService) {}

  async upload(file: UploadableFile, storageKey: string): Promise<StorageResult> {
    const root = this.config.storage.localUploadDir;
    const fullPath = join(root, storageKey);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.buffer);
    const base = this.config.storage.publicBaseUrl.replace(/\/$/, '');
    return { url: `${base}/uploads/${storageKey}`, storageKey };
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = join(this.config.storage.localUploadDir, storageKey);
    try {
      await unlink(fullPath);
    } catch (err) {
      this.logger.warn(`Failed to delete local file ${storageKey}: ${(err as Error).message}`);
    }
  }
}
