<script lang="ts">
  import Router from 'svelte-spa-router'
  import DoorbellView from './components/DoorbellView.svelte'
  import RingerView from './components/RingerView.svelte'
  import RingerHistoryView from './components/RingerHistoryView.svelte'
  import DoorbellRedirect from './components/DoorbellRedirect.svelte'
  import BuildInfo from './components/BuildInfo.svelte'

  const routes = {
    '/': DoorbellRedirect,
    '/doorbell': DoorbellRedirect,
    '/doorbell/:token': DoorbellView,
    '/ring': RingerHistoryView,
    '/ring/:token': RingerView
  }
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>
<Router {routes} />
<BuildInfo />

<style>
  :global(:root) {
    /* Text colors */
    --text-primary: #1f2937;
    --text-secondary: #4b5563;
    --text-muted: #6b7280;

    /* Brand colors */
    --color-primary: #667eea;
    --color-primary-hover: #5a6fd6;
    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-error: #ef4444;
    --color-error-hover: #dc2626;

    /* Backgrounds */
    --bg-light: #f8f9fa;
    --bg-overlay: rgba(0, 0, 0, 0.5);

    /* Border radius scale */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-full: 9999px;

    /* Spacing (following 4px scale) */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: var(--text-primary);
  }

  /* Skip link for keyboard navigation */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #667eea;
    color: white;
    padding: 8px 16px;
    z-index: 10000;
    text-decoration: none;
    font-weight: 500;
    border-radius: 0 0 4px 0;
    transition: top 0.2s;
  }

  .skip-link:focus {
    top: 0;
    outline: 3px solid #f59e0b;
    outline-offset: 2px;
  }

  /* Global focus styles */
  :global(*:focus-visible) {
    outline: 3px solid #667eea;
    outline-offset: 2px;
  }

  /* Better focus for dark backgrounds */
  :global(.ringer-view *:focus-visible),
  :global(.history-view *:focus-visible),
  :global(.dramatic-alert *:focus-visible) {
    outline-color: #f59e0b;
  }

  /* Remove default focus outline and use focus-visible */
  :global(*:focus:not(:focus-visible)) {
    outline: none;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    :global(*) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Minimum touch target size for mobile (48x48px per WCAG 2.5.5) */
  @media (pointer: coarse) {
    :global(button),
    :global(a),
    :global([role="button"]) {
      min-height: 44px;
      min-width: 44px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    :global(*:focus-visible) {
      outline-width: 4px !important;
    }
  }
</style>
