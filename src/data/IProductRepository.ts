import type { Product, ProductCatalog, VersionInfo } from './types'

/**
 * Abstraction over product storage.
 * MVP: JsonProductRepository
 * Future: SQLiteProductRepository / CloudProductRepository
 */
export interface IProductRepository {
  getCatalog(): Promise<ProductCatalog>
  getProduct(productId: string): Promise<Product | null>
  getLocalVersion(productId: string): Promise<VersionInfo | null>
}
