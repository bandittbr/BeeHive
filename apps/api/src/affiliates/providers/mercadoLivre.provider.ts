/**
 * Mercado Livre Provider — busca de produtos no programa de afiliados.
 *
 * Usa a API pública de busca do Mercado Livre + programa de afiliados.
 * Modo demo quando não configurado.
 */

import type { AffiliateProviderSearchResult } from '@beehive/platform';

export interface MercadoLivreConfig {
  clientId?: string;
  clientSecret?: string;
}

const DEMO_PRODUCTS: AffiliateProviderSearchResult[] = [
  {
    externalId: 'demo-001',
    title: 'Smartphone Samsung Galaxy S24 256GB',
    price: 3999.00,
    originalPrice: 5299.00,
    commissionRate: 8,
    rating: 4.7,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_123456-MLU78901234567_012345-F.webp',
    affiliateLink: 'https://mercadolivre.com.br/demo/smartphone-s24',
  },
  {
    externalId: 'demo-002',
    title: 'Fone de Ouvido Bluetooth JBL Tune 720BT',
    price: 299.90,
    originalPrice: 449.90,
    commissionRate: 10,
    rating: 4.5,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_789012-MLU34567890123_456789-F.webp',
    affiliateLink: 'https://mercadolivre.com.br/demo/fone-jbl',
  },
  {
    externalId: 'demo-003',
    title: 'Notebook Dell Inspiron 15 Intel Core i7 16GB',
    price: 4599.00,
    originalPrice: 5999.00,
    commissionRate: 6,
    rating: 4.6,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_345678-MLU90123456789_012345-F.webp',
    affiliateLink: 'https://mercadolivre.com.br/demo/notebook-dell',
  },
  {
    externalId: 'demo-004',
    title: 'Smart TV LG 55" 4K OLED',
    price: 3499.00,
    originalPrice: 4299.00,
    commissionRate: 7,
    rating: 4.8,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_901234-MLU56789012345_678901-F.webp',
    affiliateLink: 'https://mercadolivre.com.br/demo/tv-lg-oled',
  },
];

export class MercadoLivreProvider {
  private config: MercadoLivreConfig;

  constructor(config: MercadoLivreConfig = {}) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Busca produtos no Mercado Livre por categoria.
   * Usa a API pública de busca quando não configurado (modo demo).
   */
  async search(category: string, limit: number = 10): Promise<AffiliateProviderSearchResult[]> {
    if (!this.isConfigured()) {
      console.log(`[Mercado Livre] Modo demo: retornando produtos para "${category}"`);
      return DEMO_PRODUCTS.slice(0, limit);
    }

    try {
      // API pública de busca do Mercado Livre
      const response = await fetch(
        `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(category)}&limit=${limit}`,
      );

      if (!response.ok) {
        throw new Error(`Mercado Livre API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        results?: Array<{
          id: string;
          title: string;
          price: number;
          original_price?: number;
          currency_id: string;
          thumbnail: string;
          permalink: string;
          seller?: { id: number };
          installments?: { rate: number };
        }>;
      };

      return (data.results ?? []).map((item) => ({
        externalId: item.id,
        title: item.title,
        price: item.price,
        originalPrice: item.original_price ?? item.price,
        commissionRate: 5, // Taxa padrão do programa de afiliados
        rating: 4.0, // ML não expõe rating na busca pública
        imageUrl: item.thumbnail.replace('/I.jpg', '/O.jpg'), // Imagem maior
        affiliateLink: item.permalink,
      }));
    } catch (err) {
      console.error('[Mercado Livre] Erro na busca:', err);
      // Fallback para demo em caso de erro
      return DEMO_PRODUCTS.slice(0, limit);
    }
  }
}
