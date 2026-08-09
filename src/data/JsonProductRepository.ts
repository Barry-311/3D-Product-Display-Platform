import type { IProductRepository } from './IProductRepository'
import type { Product, ProductCatalog, VersionInfo } from './types'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

export class JsonProductRepository implements IProductRepository {
  private readonly basePath: string

  constructor(basePath = 'data') {
    this.basePath = basePath.replace(/\/$/, '')
  }

  async getCatalog(): Promise<ProductCatalog> {
    return fetchJson<ProductCatalog>(`${this.basePath}/products.json`)
  }

  async getProduct(productId: string): Promise<Product | null> {
    const catalog = await this.getCatalog()
    const item = catalog.products.find((p) => p.id === productId)
    if (!item) {
      return null
    }
    return fetchJson<Product>(`${this.basePath}/${item.dataFile}`)
  }

  async getLocalVersion(productId: string): Promise<VersionInfo | null> {
    try {
      const versions = await fetchJson<VersionInfo[]>(`${this.basePath}/version.json`)
      return versions.find((v) => v.product === productId) ?? null
    } catch {
      return null
    }
  }
}
