import {
  configureCloudinary,
  resetCloudinaryConfigForTests,
} from "./cloudinary.config";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

describe("configureCloudinary", () => {
  afterEach(() => {
    resetCloudinaryConfigForTests();
  });

  it("prefers discrete credentials over CLOUDINARY_URL", () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === "CLOUDINARY_CLOUD_NAME") return "drojump6";
        if (key === "CLOUDINARY_API_KEY") return "test-key";
        if (key === "CLOUDINARY_API_SECRET") return "test-secret";
        if (key === "CLOUDINARY_URL") {
          return "cloudinary://old-key:old-secret@iwzft7vz";
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    configureCloudinary(config);

    expect(cloudinary.config().cloud_name).toBe("drojump6");
  });
});
