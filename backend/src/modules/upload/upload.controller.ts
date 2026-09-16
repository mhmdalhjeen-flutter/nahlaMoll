import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createUploadMulterOptions } from "./multer.config";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../users/enums/user-role.enum";
import { UploadService } from "./upload.service";
import { UploadCategory } from "./storage/storage.interface";

@ApiTags("upload")
@ApiBearerAuth()
@Controller()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("admin/upload/product-image")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("file", createUploadMulterOptions()))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file, UploadCategory.PRODUCT_IMAGE);
  }

  @Post("admin/upload/category-image")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("file", createUploadMulterOptions()))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  uploadCategoryImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file, UploadCategory.CATEGORY_IMAGE);
  }

  @Post("admin/upload/payment-qr")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("file", createUploadMulterOptions()))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  uploadPaymentQr(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file, UploadCategory.PAYMENT_QR);
  }

  @Post("admin/upload/announcement-image")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("file", createUploadMulterOptions()))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  uploadAnnouncementImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(
      file,
      UploadCategory.ANNOUNCEMENT_IMAGE,
    );
  }

  @Post("upload/payment-proof")
  @Roles(UserRole.CUSTOMER)
  @UseInterceptors(FileInterceptor("file", createUploadMulterOptions()))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  uploadPaymentProof(
    @CurrentUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadService.uploadImage(
      file,
      UploadCategory.PAYMENT_PROOF,
      userId,
    );
  }
}
