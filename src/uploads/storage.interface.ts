export interface UploadableFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StorageResult {
  url: string;
  storageKey: string;
}

/**
 * Pluggable storage abstraction. Implementations: local disk (default for
 * development), S3, Cloudinary. Swap the active driver via STORAGE_DRIVER.
 */
export interface StorageDriver {
  upload(file: UploadableFile, storageKey: string): Promise<StorageResult>;
  delete(storageKey: string): Promise<void>;
}
