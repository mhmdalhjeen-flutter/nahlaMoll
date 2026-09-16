import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  STORAGE_PROVIDER,
  StorageProvider,
  UploadCategory,
  StoredFile,
} from "./storage/storage.interface";
import { ValidationException } from "../../common/exceptions/business.exception";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

@Injectable()
export class UploadService {
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: Set<string>;

  constructor(
    private configService: ConfigService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {
    this.maxFileSize = parseInt(
      this.configService.get<string>("MAX_FILE_SIZE", "5242880"),
      10,
    );
    const allowed = this.configService.get<string>(
      "ALLOWED_IMAGE_TYPES",
      "image/jpeg,image/png,image/webp,image/gif",
    );
    this.allowedMimeTypes = new Set(
      allowed.split(",").map((type) => type.trim()),
    );
  }

  async uploadImage(
    file: Express.Multer.File | undefined,
    category: UploadCategory,
    ownerId?: string,
  ): Promise<StoredFile> {
    this.validateFile(file);
    return this.storage.save(file!, category, ownerId);
  }

  async deleteFile(key: string): Promise<void> {
    if (!key || key.includes("..")) {
      throw new ValidationException("Invalid file key");
    }
    await this.storage.delete(key);
  }

  private validateFile(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new ValidationException("No file uploaded");
    }

    if (file.size > this.maxFileSize) {
      throw new ValidationException(
        `File size exceeds maximum of ${this.maxFileSize} bytes`,
      );
    }

    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new ValidationException("File type is not allowed");
    }

    const ext = file.originalname
      .slice(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new ValidationException("File extension is not allowed");
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new ValidationException("Uploaded file is empty");
    }
  }
}
