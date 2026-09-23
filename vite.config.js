import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const site = JSON.parse(readFileSync(new URL('./site.config.json', import.meta.url), 'utf8'))

// index.html 内の %SITE_URL% を site.config.json の値に置き換える(ドメイン変更を1か所で済ませるため)。
function injectSiteUrl() {
  return {
    name: 'inject-site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', site.siteUrl),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), injectSiteUrl()],
})
