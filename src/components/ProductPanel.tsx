import type { ProductCatalogItem } from '../data/types'

type ProductPanelProps = {
  products: ProductCatalogItem[]
  selectedId: string | null
  loading?: boolean
  onSelect: (productId: string) => void
}

export function ProductPanel({ products, selectedId, loading, onSelect }: ProductPanelProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-industrial-border bg-industrial-panel">
      <header className="border-b border-industrial-border px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-industrial-muted">
          Catalog
        </p>
        <h2 className="mt-1 text-sm font-semibold text-industrial-text">Product List</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="px-2 py-3 text-xs text-industrial-muted">Loading products…</p>
        )}
        {!loading && products.length === 0 && (
          <p className="px-2 py-3 text-xs text-industrial-muted">No products found.</p>
        )}
        <ul className="space-y-1">
          {products.map((product) => {
            const active = product.id === selectedId
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onSelect(product.id)}
                  className={`w-full rounded border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-industrial-accent bg-industrial-accentDim/40'
                      : 'border-transparent hover:border-industrial-border hover:bg-industrial-panelAlt'
                  }`}
                >
                  <div className="font-mono text-[11px] text-industrial-accent">{product.id}</div>
                  <div className="mt-0.5 text-sm font-medium text-industrial-text">
                    {product.name}
                  </div>
                  <div className="mt-1 text-[11px] text-industrial-muted">
                    v{product.version}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
