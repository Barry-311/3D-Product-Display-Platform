import type { UpdateCheckResult, VersionInfo } from '../data/types'
import type { IProductRepository } from '../data/IProductRepository'
import { JsonProductRepository } from '../data/JsonProductRepository'

/**
 * Future cloud update surface.
 * MVP: local version comparison only — no network download implementation.
 */
export interface RemoteVersionProvider {
  fetchRemoteVersion(productId: string): Promise<VersionInfo | null>
}

/** Placeholder remote provider — replace with enterprise cloud API later. */
export class StubRemoteVersionProvider implements RemoteVersionProvider {
  async fetchRemoteVersion(_productId: string): Promise<VersionInfo | null> {
    return null
  }
}

export class UpdateManager {
  private readonly repository: IProductRepository
  private readonly remote: RemoteVersionProvider

  constructor(
    repository: IProductRepository = new JsonProductRepository(),
    remote: RemoteVersionProvider = new StubRemoteVersionProvider(),
  ) {
    this.repository = repository
    this.remote = remote
  }

  /** Compare semantic-ish version strings (major.minor.patch). */
  compareVersions(localVersion: string, remoteVersion: string): number {
    const parse = (v: string) =>
      v
        .replace(/^v/i, '')
        .split('.')
        .map((part) => Number.parseInt(part, 10) || 0)

    const a = parse(localVersion)
    const b = parse(remoteVersion)
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i += 1) {
      const diff = (a[i] ?? 0) - (b[i] ?? 0)
      if (diff !== 0) {
        return diff < 0 ? -1 : 1
      }
    }
    return 0
  }

  async checkForUpdates(productId: string): Promise<UpdateCheckResult> {
    const local = await this.repository.getLocalVersion(productId)
    const localVersion = local?.version ?? '0.0.0'
    const remote = await this.remote.fetchRemoteVersion(productId)
    const remoteVersion = remote?.version ?? null

    const updateAvailable =
      remoteVersion !== null && this.compareVersions(localVersion, remoteVersion) < 0

    return {
      productId,
      localVersion,
      remoteVersion,
      updateAvailable,
      model: remote?.model ?? local?.model,
    }
  }

  /**
   * Download updated model package from enterprise cloud storage.
   * Not implemented in MVP — prepare call site only.
   */
  async downloadPackage(_productId: string, _version: string): Promise<void> {
    throw new Error(
      'UpdateManager.downloadPackage is not implemented. Connect enterprise cloud storage API here.',
    )
  }
}

export const updateManager = new UpdateManager()
