// vitest setup: patch Module.prototype.require to handle .ts files
// by returning pre-imported ESM modules

import Module from 'module'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import * as inputModule from '../lib/input'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Map from relative require path patterns to pre-loaded ESM modules
const esmCache: Record<string, unknown> = {}

// Register input module under various path patterns
const inputAbsPath = resolve(__dirname, '../lib/input/index.ts')
esmCache[inputAbsPath] = inputModule

// Patch Module.prototype.require so require('../lib/input') works in test files
const OriginalRequire = Module.prototype.require
Module.prototype.require = function patchedRequire(this: NodeModule, id: string) {
  // For relative paths, try resolving from the calling module's directory
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
  // Fall back to original
  return OriginalRequire.call(this, id)
} as NodeRequire['prototype']
