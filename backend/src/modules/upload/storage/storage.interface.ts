export enum UploadCategory {
  PRODUCT_IMAGE = "products",
  CATEGORY_IMAGE = "categories",
  PAYMENT_PROOF = "payment-proofs",
  PAYMENT_QR = "payment-qr",
  ANNOUNCEMENT_IMAGE = "announcements",
}

export interface StoredFile {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  save(
    file: Express.Multer.File,
    category: UploadCategory,
    ownerId?: string,
  ): Promise<StoredFile>;

  delete(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");
