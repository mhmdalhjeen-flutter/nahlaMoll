import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  ResourceNotFoundException,
  ValidationException,
} from "../../common/exceptions/business.exception";
import { CreateCategoryDto } from "./dtos/create-category.dto";
import { UpdateCategoryDto } from "./dtos/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findAllAdmin() {
    return this.prisma.category.findMany({
      include: {
        children: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.category.findFirst({
      where: { id, isActive: true },
      include: {
        products: {
          where: {
            isActive: true,
            isAvailable: true,
            availability: { not: "UNAVAILABLE" },
          },
          take: 20,
        },
        children: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.category.findFirst({
      where: { slug, isActive: true },
      include: {
        products: {
          where: {
            isActive: true,
            isAvailable: true,
            availability: { not: "UNAVAILABLE" },
          },
          take: 20,
        },
        children: true,
      },
    });
  }

  async create(dto: CreateCategoryDto) {
    await this.validateSlugUnique(dto.slug);
    await this.validateParentExists(dto.parentId);

    return this.prisma.category.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        slug: dto.slug,
        description: dto.description,
        image: dto.image,
        parentId: dto.parentId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new ResourceNotFoundException("Category", id);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      await this.validateSlugUnique(dto.slug);
    }

    if (dto.parentId !== undefined && dto.parentId !== id) {
      await this.validateParentExists(dto.parentId);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        slug: dto.slug,
        description: dto.description,
        image: dto.image,
        parentId: dto.parentId,
        isActive: dto.isActive,
      },
    });
  }

  async setActive(id: string, isActive: boolean) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException("Category", id);
    return this.prisma.category.update({ where: { id }, data: { isActive } });
  }

  async deactivate(id: string) {
    return this.setActive(id, false);
  }

  async activate(id: string) {
    return this.setActive(id, true);
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: { where: { isActive: true }, take: 1 },
        children: { take: 1 },
      },
    });

    if (!existing) {
      throw new ResourceNotFoundException("Category", id);
    }

    const hasReferences =
      existing.products.length > 0 || existing.children.length > 0;

    if (hasReferences) {
      const deactivated = await this.deactivate(id);
      return {
        action: "deactivated",
        reason:
          "Category has products or child categories and cannot be hard-deleted",
        category: deactivated,
      };
    }

    await this.prisma.category.delete({ where: { id } });
    return {
      action: "deleted",
      reason: "No references found; category hard-deleted",
      categoryId: id,
    };
  }

  private async validateSlugUnique(slug: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ValidationException(`Category slug '${slug}' already exists`);
    }
  }

  private async validateParentExists(parentId: string | undefined) {
    if (!parentId) return;
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new ResourceNotFoundException("Parent category", parentId);
    }
  }
}
