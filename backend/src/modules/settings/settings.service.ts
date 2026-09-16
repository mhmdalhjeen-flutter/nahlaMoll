import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSettingsDto } from "./dtos/update-settings.dto";
import { FREE_DELIVERY_PROGRESS_TARGET } from "../delivery/delivery.constants";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.settings.findFirst();

    if (!settings) {
      settings = await this.prisma.settings.create({
        data: {
          storeName: "متجر",
          freeDeliveryTarget: new Prisma.Decimal(FREE_DELIVERY_PROGRESS_TARGET),
          partialFreeDeliveryThreshold: new Prisma.Decimal(0),
          partialFreeDeliveryDiscount: 0,
          partialFreeDeliveryEnabled: false,
        },
      });
    }

    return settings;
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    return {
      storeName: settings.storeName,
      storeNameEn: settings.storeNameEn,
      storePhone: settings.storePhone,
      storeEmail: settings.storeEmail,
      socialMediaLinks: settings.socialMediaLinks,
      isStoreOpen: settings.isStoreOpen,
      storeClosedMessage: settings.storeClosedMessage,
      freeDeliveryTarget: FREE_DELIVERY_PROGRESS_TARGET,
      partialFreeDeliveryEnabled: false,
      partialFreeDeliveryThreshold: 0,
      partialFreeDeliveryDiscount: 0,
    };
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const current = await this.getSettings();

    const data: Record<string, unknown> = { ...dto };
    delete data.freeDeliveryTarget;
    delete data.partialFreeDeliveryEnabled;
    delete data.partialFreeDeliveryThreshold;
    delete data.partialFreeDeliveryDiscount;
    data.freeDeliveryTarget = new Prisma.Decimal(FREE_DELIVERY_PROGRESS_TARGET);
    data.partialFreeDeliveryEnabled = false;

    return this.prisma.settings.update({
      where: { id: current.id },
      data,
    });
  }

  async getDeliverySettings() {
    return {
      freeDeliveryTarget: FREE_DELIVERY_PROGRESS_TARGET,
      partialFreeDeliveryEnabled: false,
      partialFreeDeliveryThreshold: 0,
      partialFreeDeliveryDiscount: 0,
    };
  }

  async getStoreStatus() {
    const settings = await this.getSettings();
    return {
      isOpen: settings.isStoreOpen,
      message: settings.storeClosedMessage,
    };
  }

  async getPaymentSettings() {
    const settings = await this.getSettings();
    return {
      paymentInstructions: settings.paymentInstructions,
      paymentInstructionsEn: settings.paymentInstructionsEn,
      paymentQrImage: settings.paymentQrImage,
      paymentAccountDetails: settings.paymentAccountDetails,
      paymentAccountDetailsEn: settings.paymentAccountDetailsEn,
    };
  }
}
