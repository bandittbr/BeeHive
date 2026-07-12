/**
 * Tipos do módulo Afiliados — inspirado no AchadosPro.
 *
 * Gerencia discovery de produtos, geração de conteúdo e publicação
 * automática em redes sociais.
 */

// ─── Enums / Union Types ────────────────────────────────────────────

export type AffiliateProvider = 'mercado_livre' | 'shopee';
export type SocialProvider = 'instagram' | 'tiktok';
export type MediaType = 'imagem' | 'video';
export type ContentStatus = 'gerado' | 'publicado' | 'falhou';
export type ProductStatus = 'descoberto' | 'descartado' | 'em_producao';
export type PublicationStatus = 'publicado' | 'falhou';

// ─── Core Interfaces ────────────────────────────────────────────────

export interface DiscoveryRule {
  id: string;
  tenantId: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  minCommissionRate: number;
  minRating: number;
  affiliateProviders: AffiliateProvider[];
  active: boolean;
  createdAt: string;
}

export interface AutomationSettings {
  tenantId: string;
  postsPerDay: number;
  videoEnabled: boolean;
  killSwitchActive: boolean;
  updatedAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  affiliateProvider: AffiliateProvider;
  externalId: string;
  title: string;
  price: number;
  originalPrice: number;
  commissionRate: number;
  rating: number;
  imageUrl: string;
  affiliateLink: string;
  qualityScore: number;
  status: ProductStatus;
  discoveredAt: string;
}

export interface ContentItem {
  id: string;
  tenantId: string;
  productId: string;
  caption: string;
  hashtags: string[];
  mediaType: MediaType;
  mediaUrls: string[];
  aiProviderUsed: string;
  status: ContentStatus;
  createdAt: string;
  publishedAt?: string;
}

export interface Publication {
  id: string;
  tenantId: string;
  contentId: string;
  socialProvider: SocialProvider;
  externalPostId?: string;
  publishedAt?: string;
  status: PublicationStatus;
  errorMessage?: string;
}

export interface Metric {
  id: string;
  tenantId: string;
  publicationId: string;
  likes: number;
  comments: number;
  reach: number;
  clicks: number;
  syncedAt: string;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  event: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ─── Provider Interfaces ────────────────────────────────────────────

export interface AffiliateProviderSearchResult {
  externalId: string;
  title: string;
  price: number;
  originalPrice: number;
  commissionRate: number;
  rating: number;
  imageUrl: string;
  affiliateLink: string;
}

export interface PublishResult {
  externalPostId: string;
  demo: boolean;
}

// ─── AI Provider Interface ──────────────────────────────────────────

export interface AITextProvider {
  name: string;
  priority: number;
  isConfigured(): boolean;
  generateText(prompt: string): Promise<string>;
}

// ─── Zod Validation Schemas (type-only) ─────────────────────────────

export interface CreateDiscoveryRuleInput {
  category: string;
  minPrice: number;
  maxPrice: number;
  minCommissionRate: number;
  minRating: number;
  affiliateProviders: AffiliateProvider[];
}

export interface UpdateDiscoveryRuleInput {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minCommissionRate?: number;
  minRating?: number;
  affiliateProviders?: AffiliateProvider[];
  active?: boolean;
}

export interface UpdateAutomationSettingsInput {
  postsPerDay?: number;
  videoEnabled?: boolean;
  killSwitchActive?: boolean;
}
