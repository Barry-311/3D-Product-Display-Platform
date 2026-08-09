import { useEffect, useRef, useState } from 'react'
import { SceneManager } from '../three/SceneManager'
import type { SelectionCallback } from '../three/ObjectSelector'

export type ModelSource =
  | { kind: 'url'; url: string }
  | { kind: 'bytes'; data: Uint8Array; fileName: string }

type ModelViewerProps = {
  modelSource: ModelSource | null
  onProgress: (progress: number) => void
  onError: (message: string | null) => void
  onReady: (manager: SceneManager | null) => void
  onSelect: SelectionCallback
}

export function ModelViewer({
  modelSource,
  onProgress,
  onError,
  onReady,
  onSelect,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<SceneManager | null>(null)
  const [viewerReady, setViewerReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const manager = new SceneManager(container)
    managerRef.current = manager
    manager.setSelectionCallback(onSelect)
    onReady(manager)
    setViewerReady(true)

    return () => {
      manager.setSelectionCallback(null)
      manager.dispose()
      managerRef.current = null
      setViewerReady(false)
      onReady(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  useEffect(() => {
    managerRef.current?.setSelectionCallback(onSelect)
  }, [onSelect])

  useEffect(() => {
    const manager = managerRef.current
    if (!manager || !viewerReady || !modelSource) {
      return
    }

    let cancelled = false
    onError(null)
    onProgress(0.1)

    ;(async () => {
      try {
        if (modelSource.kind === 'bytes') {
          await manager.loadModelData(modelSource.data, modelSource.fileName, (p) => {
            if (!cancelled) {
              onProgress(p)
            }
          })
        } else {
          await manager.loadModel(modelSource.url, (p) => {
            if (!cancelled) {
              onProgress(Math.max(0.1, p))
            }
          })
        }
        if (!cancelled) {
          onProgress(1)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load model'
          void window.gateApi?.log(`ModelViewer load failed: ${message}`)
          onError(message)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [modelSource, viewerReady, onError, onProgress])

  return (
    <div className="relative h-full min-h-0 flex-1 bg-[#121820]">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
}
