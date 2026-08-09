export interface ProductComponent {
  id: string
  objectName: string
  name: string
  description: string
  specification?: string
  function?: string
  failure?: string
  maintenance?: string
}

export interface Product {
  id: string
  name: string
  productName: string
  version: string
  model: string
  description?: string
  components: ProductComponent[]
}

export interface ProductCatalogItem {
  id: string
  name: string
  productName: string
  version: string
  dataFile: string
}

export interface ProductCatalog {
  products: ProductCatalogItem[]
}

export interface VersionInfo {
  product: string
  version: string
  model: string
}

export interface UpdateCheckResult {
  productId: string
  localVersion: string
  remoteVersion: string | null
  updateAvailable: boolean
  model?: string
}
