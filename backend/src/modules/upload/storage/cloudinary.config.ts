import { v2 as cloudinary } from "cloudinary";
import { ConfigService } from "@nestjs/config";

let configuredCloudName: string | undefined;

/** Configure Cloudinary — discrete vars take precedence over CLOUDINARY_URL. */
export function configureCloudinary(configService: ConfigService): void {
  const cloudName = configService.get<string>("CLOUDINARY_CLOUD_NAME")?.trim();
  const apiKey = configService.get<string>("CLOUDINARY_API_KEY")?.trim();
  const apiSecret = configService.get<string>("CLOUDINARY_API_SECRET")?.trim();

  if (cloudName && apiKey && apiSecret) {
    if (configuredCloudName === cloudName) {
      return;
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configuredCloudName = cloudinary.config().cloud_name;
    return;
  }

  const cloudinaryUrl = configService.get<string>("CLOUDINARY_URL")?.trim();
  if (cloudinaryUrl) {
    if (configuredCloudName) {
      return;
    }
    cloudinary.config();
    configuredCloudName = cloudinary.config().cloud_name;
    return;
  }

  configuredCloudName = undefined;
}

export function assertCloudinaryConfigured(): void {
  if (!configuredCloudName || !cloudinary.config().cloud_name) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
}

/** @internal Test helper */
export function resetCloudinaryConfigForTests(): void {
  configuredCloudName = undefined;
  cloudinary.config(undefined);
}

export { cloudinary };
