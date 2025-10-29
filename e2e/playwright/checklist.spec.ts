import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE || 'http://localhost:4300/';

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

test.describe('Checklist responsividade', () => {
  for (const vp of viewports) {
    test(`${vp.name} - título e botões visíveis`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // garantir autenticacao fake no localStorage antes do carregamento para evitar redirect ao login
      await page.addInitScript(() => {
        try { localStorage.setItem('jwtToken', 'e2e-faketoken'); } catch(e) {}
        try { localStorage.setItem('loggedInUserEmail', 'e2e@local'); } catch(e) {}
      });
      await page.goto(BASE, { waitUntil: 'networkidle' });

      // navegar para rota de checklist se necessário
      // tenta buscar link/menu ou usar rota direta
      // navegar direto para a rota baseada em path (Angular usa PathLocationStrategy por padrão)
      await page.goto(BASE + 'checklist', { waitUntil: 'networkidle' });

      // aguardar o título renderizar
      const title = await page.locator('h1.page-title');
      await title.waitFor({ state: 'visible', timeout: 15_000 });
      await expect(title).toBeVisible();

      // verificar pelo menos um item com radio-options
      const radio = await page.locator('.radio-options').first();
      await expect(radio).toBeVisible();

      // tirar screenshot para revisão
      await page.screenshot({ path: `e2e/playwright/screenshots/checklist-${vp.name}.png`, fullPage: true });
    });
  }
});
