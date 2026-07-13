import { useState, useEffect, useCallback } from 'react';
import { Card, EmptyState, Loading, Badge, Button } from '@/components/ui';
import type { Product } from '@beehive/platform';
import { API_BASE } from '@/lib/api';
import './affiliates.css';



/**
 * View de Meus Produtos — lista produtos descobertos pelas regras de discovery.
 *
 * O usuário pode ver detalhes, descartar produtos ou acionar geração de conteúdo.
 */
export function MyProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Product['status'] | 'todos'>('todos');

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error(`Erro ao carregar produtos: ${res.status}`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDiscard = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'descartado' }),
      });
      if (!res.ok) throw new Error(`Erro ao descartar produto: ${res.status}`);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status: 'descartado' as const } : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao descartar');
    }
  };

  const filtered = filter === 'todos'
    ? products
    : products.filter((p) => p.status === filter);

  const statusBadge = (status: Product['status']) => {
    const tones: Record<Product['status'], 'neutral' | 'success' | 'info'> = {
      descoberto: 'info',
      em_producao: 'neutral',
      descartado: 'neutral',
    };
    const labels: Record<Product['status'], string> = {
      descoberto: 'Descoberto',
      em_producao: 'Em Produção',
      descartado: 'Descartado',
    };
    return <Badge tone={tones[status]}>{labels[status]}</Badge>;
  };

  if (loading) return <Loading label="Carregando produtos..." />;

  return (
    <div className="affiliates">
      {error && (
        <div className="alert alert--error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="affiliates__section-header">
        <h3>Meus Produtos ({products.length})</h3>
        <div className="affiliates__filters">
          {(['todos', 'descoberto', 'em_producao', 'descartado'] as const).map((f) => (
            <button
              key={f}
              className={`affiliates__filter-btn ${filter === f ? 'filter--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'todos' ? 'Todos' : f === 'descoberto' ? 'Descobertos' : f === 'em_producao' ? 'Em Produção' : 'Descartados'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="grid"
          title="Nenhum produto encontrado"
          description={filter === 'todos'
            ? 'Os produtos descobertos aparecerão aqui. Configure regras de discovery na aba Afiliados.'
            : `Nenhum produto com status "${filter}".`}
        />
      ) : (
        <div className="affiliates__product-grid">
          {filtered.map((product) => (
            <Card key={product.id} className="affiliates__product-card">
              {product.imageUrl && (
                <div className="affiliates__product-image">
                  <img src={product.imageUrl} alt={product.title} />
                </div>
              )}
              <div className="affiliates__product-body">
                <div className="affiliates__product-header">
                  <h4 className="affiliates__product-title">{product.title}</h4>
                  {statusBadge(product.status)}
                </div>
                <div className="affiliates__product-price">
                  <span className="price-current">R$ {product.price.toFixed(2)}</span>
                  {product.originalPrice > product.price && (
                    <span className="price-original">R$ {product.originalPrice.toFixed(2)}</span>
                  )}
                </div>
                <div className="affiliates__product-meta">
                  <span>Comissão: {product.commissionRate}%</span>
                  <span>Rating: {product.rating}/5</span>
                  <span>Score: {product.qualityScore}</span>
                </div>
                <div className="affiliates__product-provider">
                  {product.affiliateProvider === 'mercado_livre' ? 'Mercado Livre' : 'Shopee'}
                </div>
                {product.status === 'descoberto' && (
                  <div className="affiliates__product-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDiscard(product.id)}
                    >
                      Descartar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
