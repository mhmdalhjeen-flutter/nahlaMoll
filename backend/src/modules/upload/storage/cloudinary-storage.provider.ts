import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  StorageProvider,
  StoredFile,
  UploadCategory,
} from "./storage.interface";
import {
  assertCloudinaryConfigured,
  cloudinary,
  configureCloudinary,
} from "./cloudinary.config";

@Injectable()
export class CloudinaryStorageProvider implements StorageProvider {
  private readonly folderRoot: string;

  constructor(private configService: ConfigService) {
    configureCloudinary(configService);
    this.folderRoot =
      this.configService.get<string>("CLOUDINARY_FOLDER")?.trim() || "jaka";
  }

  async save(
    file: Express.Multer.File,
    category: UploadCategory,
    ownerId?: string,
  ): Promise<StoredFile> {
    configureCloudinary(this.configService);
    assertCloudinaryConfigured();

    const folder = ownerId
      ? `${this.folderRoot}/${category}/${ownerId}`
      : `${this.folderRoot}/${category}`;

    const result = await new Promise<{
      public_id: string;
      secure_url: string;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          unique_filename: true,
          overwrite: false,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve(uploadResult);
        },
      );

      uploadStream.end(file.buffer);
    });

    return {
      key: result.public_id,
      url: result.secure_url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async delete(key: string): Promise<void> {
    assertCloudinaryConfigured();
    try {
      await cloudinary.uploader.destroy(key, { resource_type: "image" });
    } catch {
      // Asset may already be removed
    }
  }
}
