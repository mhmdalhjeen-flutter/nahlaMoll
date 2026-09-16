import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UploadService } from "./upload.service";
import { STORAGE_PROVIDER, UploadCategory } from "./storage/storage.interface";
import { ValidationException } from "../../common/exceptions/business.exception";

describe("UploadService", () => {
  let service: UploadService;
  const mockStorage = {
    save: jest.fn(),
    delete: jest.fn(),
  };

  const validFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "proof.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024,
    buffer: Buffer.from("fake-image"),
    stream: null as any,
    destination: "",
    filename: "",
    path: "",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === "MAX_FILE_SIZE") return "5242880";
              if (key === "ALLOWED_IMAGE_TYPES") {
                return "image/jpeg,image/png,image/webp,image/gif";
              }
              return defaultValue;
            }),
          },
        },
        { provide: STORAGE_PROVIDER, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    jest.clearAllMocks();
  });

  it("rejects missing file", async () => {
    await expect(
      service.uploadImage(undefined, UploadCategory.PAYMENT_PROOF, "user-1"),
    ).rejects.toThrow(ValidationException);
  });

  it("rejects disallowed mime type", async () => {
    await expect(
      service.uploadImage(
        { ...validFile, mimetype: "application/pdf" },
        UploadCategory.PAYMENT_PROOF,
        "user-1",
      ),
    ).rejects.toThrow(ValidationException);
  });

  it("rejects oversized file", async () => {
    await expect(
      service.uploadImage(
        { ...validFile, size: 10 * 1024 * 1024 },
        UploadCategory.PAYMENT_PROOF,
        "user-1",
      ),
    ).rejects.toThrow(ValidationException);
  });

  it("stores valid image via storage provider", async () => {
    mockStorage.save.mockResolvedValue({
      key: "payment-proofs/user-1/abc.jpg",
      url: "http://localhost:3001/uploads/payment-proofs/user-1/abc.jpg",
      originalName: "proof.jpg",
      mimeType: "image/jpeg",
      size: 1024,
    });

    const result = await service.uploadImage(
      validFile,
      UploadCategory.PAYMENT_PROOF,
      "user-1",
    );

    expect(mockStorage.save).toHaveBeenCalledWith(
      validFile,
      UploadCategory.PAYMENT_PROOF,
      "user-1",
    );
    expect(result.url).toContain("/uploads/");
  });

  it("accepts GIF uploads", async () => {
    mockStorage.save.mockResolvedValue({
      key: "jaka/products/abc.gif",
      url: "https://res.cloudinary.com/drojump6/image/upload/v1/jaka/products/abc.gif",
      originalName: "anim.gif",
      mimeType: "image/gif",
      size: 2048,
    });

    const gifFile: Express.Multer.File = {
      ...validFile,
      originalname: "anim.gif",
      mimetype: "image/gif",
    };

    const result = await service.uploadImage(
      gifFile,
      UploadCategory.PRODUCT_IMAGE,
    );

    expect(result.url).toContain("drojump6");
    expect(result.url).toContain(".gif");
  });

  it("rejects path traversal on delete", async () => {
    await expect(service.deleteFile("../secret")).rejects.toThrow(
      ValidationException,
    );
  });
});
