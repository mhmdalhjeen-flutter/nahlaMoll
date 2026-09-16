import { plainToInstance } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from "class-validator";

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, {
    message: "JWT_SECRET must be at least 32 characters in production",
  })
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_SECRET?: string;

  @IsOptional()
  @IsString()
  BACKEND_URL?: string;

  @IsOptional()
  @IsString()
  STORE_FRONTEND_URL?: string;

  @IsOptional()
  @IsString()
  ADMIN_FRONTEND_URL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join("; ");
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validated;
}

export function validateEnvForRuntime() {
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  if (isTest) {
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (isProduction) {
    if (process.env.LOAD_TEST_MODE === "true") {
      throw new Error("LOAD_TEST_MODE must not be enabled in production");
    }
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
    if (rateLimitMax > 200) {
      throw new Error(
        "RATE_LIMIT_MAX must not exceed 200 in production (recommended: 100)",
      );
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters in production",
      );
    }
    const storageProvider = process.env.STORAGE_PROVIDER || "local";
    if (storageProvider === "cloudinary") {
      const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL?.trim());
      const hasDiscreteCloudinary =
        Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim()) &&
        Boolean(process.env.CLOUDINARY_API_KEY?.trim()) &&
        Boolean(process.env.CLOUDINARY_API_SECRET?.trim());
      if (!hasCloudinaryUrl && !hasDiscreteCloudinary) {
        throw new Error(
          "CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) is required when STORAGE_PROVIDER=cloudinary in production",
        );
      }
    }
    const hasCorsList = Boolean(process.env.CORS_ORIGINS?.trim());
    const hasLegacyCors =
      Boolean(process.env.STORE_FRONTEND_URL) &&
      Boolean(process.env.ADMIN_FRONTEND_URL);
    if (!hasCorsList && !hasLegacyCors) {
      throw new Error(
        "CORS_ORIGINS (or STORE_FRONTEND_URL + ADMIN_FRONTEND_URL) is required in production",
      );
    }
  }
}
