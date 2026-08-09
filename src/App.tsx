import { useCallback, useEffect, useState } from 'react'
import { ComponentInfo } from './components/ComponentInfo'
import { ModelViewer, type ModelSource } from './components/ModelViewer'
import { ProductPanel } from './components/ProductPanel'
import { Toolbar } from './components/Toolbar'
import { productDataManager } from './data/ProductDataManager'
import type { Product, ProductCatalogItem, ProductComponent } from './data/types'
import type { SceneManager } from './three/SceneManager'

export default function App() {
  const [products, setProducts] = useState<ProductCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [component, setComponent] = useState<ProductComponent | null>(null)
  const [modelSource, setModelSource] = useState<ModelSource | null>(null)
  const [loadProgress, setLoadProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Loading model')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [productError, setProductError] = useState<string | null>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null)
  const [appVersion, setAppVersion] = useState('1.0.0')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const catalog = await productDataManager.loadCatalog()
        if (cancelled) {
          return
        }
        setProducts(catalog)
        if (catalog[0]) {
          setSelectedId(catalog[0].id)
        }
      } catch (err) {
        if (!cancelled) {
          setProductError(err instanceof Error ? err.message : 'Failed to load catalog')
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    window.gateApi?.getAppVersion().then(setAppVersion).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!selectedId) {
      return
    }
    let cancelled = false
    const unsubscribe = window.gateApi?.onPrepareProgress((payload) => {
      if (cancelled) {
        return
      }
      setStatusMessage(payload.message)
      // Prepare phase occupies 0–85%; viewer load owns 85–100%.
      setLoadProgress(Math.max(0.02, Math.min(0.85, payload.progress * 0.85)))
    })

    ;(async () => {
      try {
        setProductError(null)
        setLoadError(null)
        setComponent(null)
        setModelSource(null)
        setLoadProgress(0.02)
        setStatusMessage('Loading product…')

        const loaded = await productDataManager.loadProduct(selectedId)
        if (cancelled) {
          return
        }
        setProduct(loaded)

        if (!window.gateApi?.prepareModel) {
          setModelSource({ kind: 'url', url: loaded.model })
          setStatusMessage('Loading model')
          return
        }

        setStatusMessage(
          /\.(stp|step)$/i.test(loaded.model)
            ? 'Converting STEP to GLB…'
            : 'Preparing model…',
        )
        const prepared = await window.gateApi.prepareModel(loaded.model)
        if (cancelled) {
          return
        }
        setStatusMessage(
          prepared.convertedFromStp ? 'Loading converted model…' : 'Loading model…',
        )
        setLoadProgress(0.88)
        void window.gateApi?.log(`UI loading model url=${prepared.modelUrl}`)
        setModelSource({
          kind: 'url',
          url: prepared.modelUrl,
        })
      } catch (err) {
        if (!cancelled) {
          setProduct(null)
          setModelSource(null)
          const message = err instanceof Error ? err.message : 'Failed to load product'
          void window.gateApi?.log(`UI prepare failed: ${message}`)
          setProductError(message)
        }
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [selectedId])

  const handleSelectObject = useCallback((objectName: string | null) => {
    if (!objectName) {
      setComponent(null)
      return
    }
    setComponent(productDataManager.findComponent(objectName))
  }, [])

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => {
      const next = !prev
      sceneManager?.setModelSpin(next)
      return next
    })
  }, [sceneManager])

  const handleRotateLeft = useCallback(() => {
    sceneManager?.rotateModelY(45)
  }, [sceneManager])

  const handleRotateRight = useCallback(() => {
    sceneManager?.rotateModelY(-45)
  }, [sceneManager])

  const handleRotateUp = useCallback(() => {
    sceneManager?.rotateModelX(-45)
  }, [sceneManager])

  const handleRotateDown = useCallback(() => {
    sceneManager?.rotateModelX(45)
  }, [sceneManager])

  const handleResetModelRotation = useCallback(() => {
    sceneManager?.resetModelRotation()
  }, [sceneManager])

  const handleMoveUp = useCallback(() => {
    sceneManager?.moveModelY(0.2)
  }, [sceneManager])

  const handleMoveDown = useCallback(() => {
    sceneManager?.moveModelY(-0.2)
  }, [sceneManager])

  const handlePlaceOnGround = useCallback(() => {
    sceneManager?.placeModelOnGround()
  }, [sceneManager])

  const handleViewerProgress = useCallback((p: number) => {
    // Map viewer progress into 85–100%.
    setLoadProgress(0.85 + Math.max(0, Math.min(1, p)) * 0.15)
  }, [])

  // Keep toolbar spin state in sync when product/model changes.
  useEffect(() => {
    setAutoRotate(false)
    sceneManager?.setModelSpin(false)
  }, [selectedId, sceneManager])

  const isLoading = Boolean(selectedId) && loadProgress < 0.999 && !loadError && !productError

  return (
    <div className="flex h-full min-h-screen flex-col bg-industrial-bg text-industrial-text">
      <header className="flex items-center justify-between border-b border-industrial-border bg-industrial-panel px-4 py-2.5">
        <div>
          <h1 className="text-base font-semibold tracking-wide text-white">
            Gate Digital Twin Viewer
          </h1>
          <p className="font-mono text-[11px] text-industrial-muted">
            Industrial 3D Product Knowledge System
          </p>
        </div>
        <div className="text-right font-mono text-[11px] text-industrial-muted">
          <div>Build v{appVersion}</div>
          {product && <div>Product v{product.version}</div>}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <ProductPanel
          products={products}
          selectedId={selectedId}
          loading={catalogLoading}
          onSelect={setSelectedId}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <Toolbar
            autoRotate={autoRotate}
            disabled={!modelSource || Boolean(loadError)}
            onResetView={() => sceneManager?.resetView()}
            onFitModel={() => sceneManager?.fitModel()}
            onToggleAutoRotate={handleToggleAutoRotate}
            onRotateLeft={handleRotateLeft}
            onRotateRight={handleRotateRight}
            onRotateUp={handleRotateUp}
            onRotateDown={handleRotateDown}
            onResetModelRotation={handleResetModelRotation}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onPlaceOnGround={handlePlaceOnGround}
          />

          <div className="relative min-h-0 flex-1">
            <ModelViewer
              modelSource={modelSource}
              onProgress={handleViewerProgress}
              onError={setLoadError}
              onReady={setSceneManager}
              onSelect={handleSelectObject}
            />

            {isLoading && (
              <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
                <div className="w-80 rounded border border-industrial-border bg-industrial-panel/95 px-4 py-3 shadow-lg">
                  <div className="mb-2 flex justify-between gap-3 text-xs text-industrial-muted">
                    <span className="truncate">{statusMessage}</span>
                    <span>{Math.round(loadProgress * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-industrial-panelAlt">
                    <div
                      className="h-full bg-industrial-accent transition-all duration-150"
                      style={{ width: `${Math.max(4, loadProgress * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {(loadError || productError) && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
                <div className="max-w-xl rounded border border-industrial-danger/50 bg-[#2a1518] px-4 py-3 text-sm text-[#ffb4b4]">
                  {productError ?? loadError}
                </div>
              </div>
            )}
          </div>
        </main>

        <ComponentInfo product={product} component={component} />
      </div>
    </div>
  )
}
