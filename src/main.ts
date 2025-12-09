import { mount } from 'svelte'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  // Use import.meta.env.BASE_URL to handle deployments with base path (e.g., GitHub Pages)
  const swUrl = `${import.meta.env.BASE_URL}sw.js`
  navigator.serviceWorker.register(swUrl).catch((error) => {
    if (import.meta.env.DEV) {
      console.warn('Service worker registration failed:', error)
    }
  })
}

export default app
