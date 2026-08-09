import type { Product, ProductComponent } from '../data/types'

type ComponentInfoProps = {
  product: Product | null
  component: ProductComponent | null
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null
  }
  return (
    <div className="border-b border-industrial-border/70 py-3 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-industrial-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-relaxed text-industrial-text">{value}</dd>
    </div>
  )
}

export function ComponentInfo({ product, component }: ComponentInfoProps) {
  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-industrial-border bg-industrial-panel">
      <header className="border-b border-industrial-border px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-industrial-muted">
          Knowledge
        </p>
        <h2 className="mt-1 text-sm font-semibold text-industrial-text">
          Component Information
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {product && (
          <div className="mb-4 rounded border border-industrial-border bg-industrial-panelAlt px-3 py-2">
            <p className="font-mono text-[11px] text-industrial-accent">{product.productName}</p>
            <p className="mt-0.5 text-xs text-industrial-muted">{product.name}</p>
          </div>
        )}

        {!component && (
          <div className="rounded border border-dashed border-industrial-border px-3 py-6 text-center">
            <p className="text-sm text-industrial-muted">
              Click a component on the 3D model to view specifications, failure modes, and
              maintenance guidance.
            </p>
          </div>
        )}

        {component && (
          <dl>
            <InfoRow label="Name" value={component.name} />
            <InfoRow label="Object" value={component.objectName} />
            <InfoRow label="Specification" value={component.specification ?? component.description} />
            <InfoRow label="Function" value={component.function} />
            <InfoRow label="Common Failure" value={component.failure} />
            <InfoRow label="Maintenance" value={component.maintenance} />
            <InfoRow label="Description" value={component.description} />
          </dl>
        )}
      </div>
    </aside>
  )
}
