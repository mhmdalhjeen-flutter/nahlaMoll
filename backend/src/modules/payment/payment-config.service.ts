import { Injectable } from "@nestjs/common";
import { PaymentMethodType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ResourceNotFoundException } from "../../common/exceptions/business.exception";
import { CreatePaymentAccountDto } from "./dtos/create-payment-account.dto";
import { UpdatePaymentAccountDto } from "./dtos/update-payment-account.dto";
import { UpdateCodSettingsDto } from "./dtos/update-cod-settings.dto";

const METHOD_ENABLED_FIELD: Record<
  PaymentMethodType,
  "bankOfPalestineEnabled" | "palPayEnabled" | "jawwalPayEnabled"
> = {
  [PaymentMethodType.BANK_OF_PALESTINE]: "bankOfPalestineEnabled",
  [PaymentMethodType.PALPAY]: "palPayEnabled",
  [PaymentMethodType.JAWWAL_PAY]: "jawwalPayEnabled",
};

@Injectable()
export class PaymentConfigService {
  constructor(private prisma: PrismaService) {}

  private async getSettingsRow() {
    let settings = await this.prisma.settings.findFirst();
    if (!settings) {
      settings = await this.prisma.settings.create({
        data: {
          storeName: "متجر",
          freeDeliveryTarget: 100,
          partialFreeDeliveryThreshold: 0,
          partialFreeDeliveryDiscount: 0,
          partialFreeDeliveryEnabled: false,
        },
      });
    }
    return settings;
  }

  async getAdminConfig() {
    const settings = await this.getSettingsRow();
    const accounts = await this.prisma.paymentAccount.findMany({
      orderBy: [{ method: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return {
      cod: {
        enabled: settings.codEnabled,
        note: settings.codNote,
      },
      methods: {
        BANK_OF_PALESTINE: {
          enabled: settings.bankOfPalestineEnabled,
          accounts: accounts.filter(
            (a) => a.method === PaymentMethodType.BANK_OF_PALESTINE,
          ),
        },
        PALPAY: {
          enabled: settings.palPayEnabled,
          accounts: accounts.filter(
            (a) => a.method === PaymentMethodType.PALPAY,
          ),
        },
        JAWWAL_PAY: {
          enabled: settings.jawwalPayEnabled,
          accounts: accounts.filter(
            (a) => a.method === PaymentMethodType.JAWWAL_PAY,
          ),
        },
      },
      legacy: {
        paymentInstructions: settings.paymentInstructions,
        paymentAccountDetails: settings.paymentAccountDetails,
        paymentQrImage: settings.paymentQrImage,
      },
    };
  }

  async updateCodSettings(dto: UpdateCodSettingsDto) {
    const settings = await this.getSettingsRow();
    return this.prisma.settings.update({
      where: { id: settings.id },
      data: {
        codEnabled: dto.codEnabled,
        codNote: dto.codNote,
      },
    });
  }

  async setMethodEnabled(method: PaymentMethodType, enabled: boolean) {
    const settings = await this.getSettingsRow();
    const field = METHOD_ENABLED_FIELD[method];
    return this.prisma.settings.update({
      where: { id: settings.id },
      data: { [field]: enabled },
    });
  }

  async createAccount(dto: CreatePaymentAccountDto) {
    const count = await this.prisma.paymentAccount.count({
      where: { method: dto.method },
    });

    const shouldActivate = dto.isActive ?? count === 0;

    if (shouldActivate) {
      await this.deactivateAllForMethod(dto.method);
    }

    const account = await this.prisma.paymentAccount.create({
      data: {
        method: dto.method,
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        qrImageUrl: dto.qrImageUrl,
        isActive: shouldActivate,
        sortOrder: dto.sortOrder ?? count,
      },
    });

    await this.syncLegacyPaymentFields();
    return account;
  }

  async updateAccount(id: string, dto: UpdatePaymentAccountDto) {
    const existing = await this.findAccount(id);

    if (dto.isActive === true) {
      await this.deactivateAllForMethod(existing.method);
    }

    const account = await this.prisma.paymentAccount.update({
      where: { id },
      data: {
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        qrImageUrl: dto.qrImageUrl,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });

    await this.syncLegacyPaymentFields();
    return account;
  }

  async activateAccount(id: string) {
    const account = await this.findAccount(id);
    await this.deactivateAllForMethod(account.method);
    const updated = await this.prisma.paymentAccount.update({
      where: { id },
      data: { isActive: true },
    });
    await this.syncLegacyPaymentFields();
    return updated;
  }

  async removeAccount(id: string) {
    const existing = await this.findAccount(id);
    await this.prisma.paymentAccount.delete({ where: { id } });

    if (existing.isActive) {
      const next = await this.prisma.paymentAccount.findFirst({
        where: { method: existing.method },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (next) {
        await this.prisma.paymentAccount.update({
          where: { id: next.id },
          data: { isActive: true },
        });
      }
    }

    await this.syncLegacyPaymentFields();
    return { deleted: true };
  }

  async getPublicPaymentConfig() {
    const settings = await this.getSettingsRow();
    const accounts = await this.prisma.paymentAccount.findMany({
      where: { isActive: true },
    });

    const activeByMethod = (method: PaymentMethodType) =>
      accounts.find((a) => a.method === method) ?? null;

    const bankAccount = activeByMethod(PaymentMethodType.BANK_OF_PALESTINE);
    const palPayAccount = activeByMethod(PaymentMethodType.PALPAY);
    const jawwalAccount = activeByMethod(PaymentMethodType.JAWWAL_PAY);

    return {
      cod: settings.codEnabled
        ? { enabled: true, note: settings.codNote }
        : { enabled: false, note: null },
      methods: {
        bankOfPalestine: settings.bankOfPalestineEnabled
          ? this.toPublicAccount(bankAccount)
          : null,
        palPay: settings.palPayEnabled
          ? this.toPublicAccount(palPayAccount)
          : null,
        jawwalPay: settings.jawwalPayEnabled
          ? this.toPublicAccount(jawwalAccount)
          : null,
      },
      paymentInstructions: settings.paymentInstructions,
      paymentInstructionsEn: settings.paymentInstructionsEn,
      paymentAccountDetails: settings.paymentAccountDetails,
      paymentAccountDetailsEn: settings.paymentAccountDetailsEn,
      paymentQrImage: settings.paymentQrImage,
    };
  }

  private toPublicAccount(
    account: {
      accountName: string;
      accountNumber: string;
      qrImageUrl: string | null;
    } | null,
  ) {
    if (!account) return null;
    return {
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      qrImageUrl: account.qrImageUrl,
    };
  }

  private async findAccount(id: string) {
    const account = await this.prisma.paymentAccount.findUnique({
      where: { id },
    });
    if (!account) throw new ResourceNotFoundException("PaymentAccount", id);
    return account;
  }

  private async deactivateAllForMethod(method: PaymentMethodType) {
    await this.prisma.paymentAccount.updateMany({
      where: { method },
      data: { isActive: false },
    });
  }

  /** Keep legacy Settings fields in sync for existing store checkout flow */
  private async syncLegacyPaymentFields() {
    const settings = await this.getSettingsRow();
    const activeBank = await this.prisma.paymentAccount.findFirst({
      where: {
        method: PaymentMethodType.BANK_OF_PALESTINE,
        isActive: true,
      },
    });

    const legacyDetails = activeBank
      ? `${activeBank.accountName}\n${activeBank.accountNumber}`
      : null;

    await this.prisma.settings.update({
      where: { id: settings.id },
      data: {
        paymentAccountDetails: legacyDetails,
        paymentQrImage: activeBank?.qrImageUrl ?? null,
      },
    });
  }
}
