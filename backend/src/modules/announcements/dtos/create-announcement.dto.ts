import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateAnnouncementDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  contentEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: "Optional announcement image URL" })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;
}
