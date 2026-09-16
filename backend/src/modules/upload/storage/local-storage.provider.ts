import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import {
  getBackendPublicOrigin,
  resolveUploadsRoot,
} from "../../../config/uploads-path";
import {
  StorageProvider,
  StoredFile,
  UploadCategory,
} from "./storage.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadRoot: string;
  private readonly publicBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadRoot = resolveUploadsRoot();
    this.publicBaseUrl =
      this.configService.get<string>("BACKEND_URL")?.trim() ||
      getBackendPublicOrigin();
  }

  async save(
    file: Express.Multer.File,
    category: UploadCategory,
    ownerId?: string,
  ): Promise<StoredFile> {
    const ext = extname(file.originalname).toLowerCase();
    const safeName = `${randomUUID()}${ext}`;
    const relativeDir = ownerId ? join(category, ownerId) : category;
    const relativePath = join(relativeDir, safeName);
    const absoluteDir = join(this.uploadRoot, relativeDir);
    const absolutePath = join(this.uploadRoot, relativePath);

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, file.buffer);

    const key = relativePath.replace(/\\/g, "/");
    const url = `${this.publicBaseUrl.replace(/\/+$/, "")}/uploads/${key}`;

    return {
      key,
      url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async delete(key: string): Promise<void> {
    const absolutePath = join(this.uploadRoot, key);
    try {
      await unlink(absolutePath);
    } catch {
      // File may already be removed
    }
  }
}
