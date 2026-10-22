import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devServer: { port: 3002 },
  devtools: { enabled: true },
  // Internal tool behind a login: no SEO to win, and every page needs the session first.
  ssr: false,
  app: {
    head: {
      title: 'Klontong Admin',
      htmlAttrs: { lang: 'id' },
      link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' }],
    },
  },
  runtimeConfig: {
    // Server-only (never sent to the browser). NUXT_API_BASE overrides it at runtime.
    apiBase: 'http://127.0.0.1:3001',
  },
  build: { transpile: ['vuetify'] },
  modules: [
    '@pinia/nuxt',
    // Vuetify's documented manual Nuxt setup (vuetify-nuxt-module is still a release candidate)
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error -- plugins is always set by the time this hook runs
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
  ],
  vite: { vue: { template: { transformAssetUrls } } },
})