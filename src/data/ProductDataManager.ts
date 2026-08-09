import { JsonProductRepository } from './JsonProductRepository'
import type { IProductRepository } from './IProductRepository'
import type { Product, ProductCatalogItem, ProductComponent } from './types'

/**
 * Application-facing product knowledge API.
 * Loads JSON today; repository can be swapped for SQLite/cloud later.
 */
export class ProductDataManager {
  private catalog: ProductCatalogItem[] = []
  private currentProduct: Product | null = null
  private readonly repository: IProductRepository

  constructor(repository: IProductRepository = new JsonProductRepository()) {
    this.repository = repository
  }

  async loadCatalog(): Promise<ProductCatalogItem[]> {
    const catalog = await this.repository.getCatalog()
    this.catalog = catalog.products
    return this.catalog
  }

  getCatalog(): ProductCatalogItem[] {
    return this.catalog
  }

  async loadProduct(productId: string): Promise<Product> {
    const product = await this.repository.getProduct(productId)
    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }
    this.currentProduct = product
    return product
  }

  getCurrentProduct(): Product | null {
    return this.currentProduct
  }

  findComponent(objectNameOrId: string): ProductComponent | null {
    if (!this.currentProduct) {
      return null
    }
    const key = objectNameOrId.toLowerCase()
    const exact =
      this.currentProduct.components.find(
        (c) =>
          c.objectName.toLowerCase() === key ||
          c.id.toLowerCase() === key ||
          c.name.toLowerCase() === key,
      ) ?? null
    if (exact) {
      return exact
    }
    // CAD mesh names may include suffixes; match by part-number prefix.
    return (
      this.currentProduct.components.find(
        (c) =>
          key.includes(c.objectName.toLowerCase()) ||
          c.objectName.toLowerCase().includes(key),
      ) ?? null
    )
  }

  searchComponents(query: string): ProductComponent[] {
    if (!this.currentProduct || !query.trim()) {
      return this.currentProduct?.components ?? []
    }
    const q = query.toLowerCase()
    return this.currentProduct.components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.objectName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    )
  }
}

export const productDataManager = new ProductDataManager()
