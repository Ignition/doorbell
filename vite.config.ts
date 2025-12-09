import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import istanbul from 'vite-plugin-istanbul'
import path from 'path'
import { execSync } from 'child_process'

const enableCoverage = process.env.COVERAGE === 'true'

// Get git hash and build timestamp
function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

const buildInfo = {
  gitHash: getGitHash(),
  buildTime: new Date().toISOString()
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  define: {
    __BUILD_HASH__: JSON.stringify(buildInfo.gitHash),
    __BUILD_TIME__: JSON.stringify(buildInfo.buildTime)
  },
  plugins: [
    svelte(),
    enableCoverage && istanbul({
      include: 'src/*',
      exclude: ['node_modules', 'tests'],
      extension: ['.ts', '.svelte'],
      requireEnv: false
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib')
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext'
  }
})
