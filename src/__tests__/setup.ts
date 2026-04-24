// Node 환경에서만 Module.prototype.require 패치
// jsdom 환경(DeckLoader 테스트)에서는 불필요
if (typeof window === 'undefined') {
  const { default: Module } = await import('module')
  const { resolve } = await import('path')
  const { fileURLToPath } = await import('url')
  const inputModule = await import('../lib/input')

  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  const esmCache: Record<string, unknown> = {}
  const inputAbsPath = resolve(__dirname, '../lib/input/index.ts')
  esmCache[inputAbsPath] = inputModule

  const OriginalRequire = Module.prototype.require
  Module.prototype.require = function patchedRequire(this: NodeModule, id: string) {
    if (id.startsWith('.') && this.filename) {
      const callerDir = resolve(this.filename, '..')
      const candidates = [
        resolve(callerDir, id + '/index.ts'),
        resolve(callerDir, id + '.ts'),
      ]
      for (const candidate of candidates) {
        if (esmCache[candidate]) {
          return esmCache[candidate]
        }
      }
    }
    return OriginalRequire.call(this, id)
  } as NodeRequire['prototype']
}
