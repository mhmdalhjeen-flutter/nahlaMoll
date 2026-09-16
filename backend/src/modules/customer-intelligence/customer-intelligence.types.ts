import { CustomerInteractionType } from "@prisma/client";

export type AffinityStrength = "high" | "medium" | "low";

export interface AffinityEntry {
  id: string;
  label?: string;
  score: number;
  recentScore: number;
  strength: AffinityStrength;
  reasons: string[];
}

export interface CustomerAffinityProfile {
  userId?: string;
  sessionId?: string;
  computedAt: string;
  hasBehavioralData: boolean;
  signalCount: number;
  categories: AffinityEntry[];
  tags: AffinityEntry[];
  products: AffinityEntry[];
  searches: AffinityEntry[];
  meta: {
    recentSignalCount: number;
    oldestSignalAt?: string;
    newestSignalAt?: string;
  };
}

/** Normalized input row for pure scoring logic. */
export interface IntelligenceSignalInput {
  type:
    | CustomerInteractionType
    | "SUPPLEMENTAL_FAVORITE"
    | "SUPPLEMENTAL_CART"
    | "SUPPLEMENTAL_ORDER";
  createdAt: Date;
  productId?: string | null;
  categoryId?: string | null;
  searchTerm?: string | null;
  tags?: string[];
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ResolvedSignal {
  dedupeKey: string;
  type: IntelligenceSignalInput["type"];
  createdAt: Date;
  baseWeight: number;
  productId?: string;
  categoryId?: string;
  searchTerm?: string;
  tags: string[];
  source?: string;
  reasonLabel: string;
}
