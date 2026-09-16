import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CloudinaryStorageProvider } from "./cloudinary-storage.provider";
import { UploadCategory } from "./storage.interface";

jest.mock("./cloudinary.config", () => ({
  configureCloudinary: jest.fn(),
  assertCloudinaryConfigured: jest.fn(),
  cloudinary: {
    uploader: {
      upload_stream: jest.fn(
        (
          _opts: unknown,
          callback: (
            err: Error | null,
            result?: { public_id: string; secure_url: string },
          ) => void,
        ) => {
          callback(null, {
            public_id: "jaka/products/test-id",
            secure_url:
              "https://res.cloudinary.com/demo/image/upload/v1/jaka/products/test-id.jpg",
          });
          return { end: jest.fn() };
        },
      ),
      destroy: jest.fn().mockResolvedValue({ result: "ok" }),
    },
  },
}));

describe("CloudinaryStorageProvider", () => {
  let provider: CloudinaryStorageProvider;

  const file: Express.Multer.File = {
    fieldname: "file",
    originalname: "photo.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 100,
    buffer: Buffer.from("fake"),
    stream: null as any,
    destination: "",
    filename: "",
    path: "",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryStorageProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === "CLOUDINARY_FOLDER") return "jaka";
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get(CloudinaryStorageProvider);
  });

  it("uploads to Cloudinary and returns secure URL + public_id key", async () => {
    const result = await provider.save(file, UploadCategory.PRODUCT_IMAGE);

    expect(result.key).toBe("jaka/products/test-id");
    expect(result.url).toContain("res.cloudinary.com");
    expect(result.originalName).toBe("photo.jpg");
  });
});
