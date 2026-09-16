import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UploadService } from "./upload.service";
import { UploadController } from "./upload.controller";
import { LocalStorageProvider } from "./storage/local-storage.provider";
import { CloudinaryStorageProvider } from "./storage/cloudinary-storage.provider";
import { STORAGE_PROVIDER } from "./storage/storage.interface";

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    LocalStorageProvider,
    CloudinaryStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (
        config: ConfigService,
        local: LocalStorageProvider,
        cloudinary: CloudinaryStorageProvider,
      ) => {
        const explicit = config.get<string>("STORAGE_PROVIDER")?.trim();
        const hasDiscreteCloudinary =
          Boolean(config.get<string>("CLOUDINARY_CLOUD_NAME")?.trim()) &&
          Boolean(config.get<string>("CLOUDINARY_API_KEY")?.trim()) &&
          Boolean(config.get<string>("CLOUDINARY_API_SECRET")?.trim());
        const hasCloudinaryUrl = Boolean(
          config.get<string>("CLOUDINARY_URL")?.trim(),
        );
        const provider =
          explicit ??
          (hasDiscreteCloudinary || hasCloudinaryUrl ? "cloudinary" : "local");

        if (provider === "local") {
          return local;
        }

        if (provider === "cloudinary") {
          return cloudinary;
        }

        if (provider === "r2") {
          throw new Error(
            "STORAGE_PROVIDER=r2 is reserved for production object storage. " +
              "Configure R2 credentials and implement R2StorageProvider before enabling.",
          );
        }

        throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
      },
      inject: [ConfigService, LocalStorageProvider, CloudinaryStorageProvider],
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
