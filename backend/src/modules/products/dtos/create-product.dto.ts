import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsDate,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  OfferType,
  ProductAvailability,
  ProductCondition,
} from "@prisma/client";
import { CreateVariantDto } from "./create-variant.dto";

export { CreateVariantDto } from "./create-variant.dto";

export class CreateProductDto {
  @ApiProperty({ description: "Product name (Arabic)" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Product name (English)" })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: "Product description (Arabic)" })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: "Product description (English)" })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiProperty({ description: "Category ID" })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: "Product price" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description:
      "Percentage contribution per unit toward free delivery (may exceed 100)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDeliveryValue?: number = 0;

  @ApiPropertyOptional({
    description: "SUB_NEAR area percentage contribution per unit",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDeliveryValueSubNear?: number = 0;

  @ApiPropertyOptional({
    description: "SUB_FAR area percentage contribution per unit",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDeliveryValueSubFar?: number = 0;

  @ApiPropertyOptional({
    description: "Availability type",
    enum: ProductAvailability,
  })
  @IsOptional()
  @IsEnum(ProductAvailability)
  availability?: ProductAvailability = ProductAvailability.UNLIMITED;

  @ApiPropertyOptional({ description: "Stock quantity (only for LIMITED)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number = 0;

  @ApiPropertyOptional({ description: "Is product available in catalog" })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean = true;

  @ApiPropertyOptional({ description: "Is recommended product" })
  @IsOptional()
  @IsBoolean()
  isRecommended?: boolean = false;

  @ApiPropertyOptional({
    description: "Product condition",
    enum: ProductCondition,
  })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition = ProductCondition.NEW;

  @ApiPropertyOptional({ description: "Tags" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  @ApiPropertyOptional({ description: "Image URLs" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[] = [];

  @ApiPropertyOptional({ description: "Whether an offer is enabled" })
  @IsOptional()
  @IsBoolean()
  hasOffer?: boolean = false;

  @ApiPropertyOptional({ enum: OfferType })
  @ValidateIf((dto) => dto.hasOffer === true)
  @IsEnum(OfferType)
  offerType?: OfferType;

  @ApiPropertyOptional({ description: "Non-negative offer value" })
  @ValidateIf((dto) => dto.hasOffer === true)
  @IsNumber()
  @Min(0)
  offerValue?: number;

  @ApiPropertyOptional({ description: "Offer start date" })
  @ValidateIf((dto) => dto.hasOffer === true)
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  offerStartDate?: Date;

  @ApiPropertyOptional({ description: "Offer end date" })
  @ValidateIf((dto) => dto.hasOffer === true)
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  offerEndDate?: Date;

  @ApiPropertyOptional({
    description: "Product variants",
    type: () => CreateVariantDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
