const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/precio', async (req, res) => {
  const { keyword } = req.body;
  
  if (!keyword) {
    return res.status(400).json({ error: 'keyword requerida' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale: 'ja-JP'
    });
    const page = await context.newPage();

    const url = `https://jp.mercari.com/search?keyword=${encodeURIComponent(keyword)}&status=on_sale&item_condition_id=1&shipping_payer_id=1&sort=price&order=asc`;
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const precios = await page.evaluate(() => {
      const elementos = document.querySelectorAll('[data-testid="price"]');
      return Array.from(elementos).map(el => {
        const texto = el.textContent.replace(/[^0-9]/g, '');
        return parseInt(texto);
      }).filter(p => !isNaN(p) && p >= 500 && p <= 200000);
    });

    await browser.close();

    if (precios.length === 0) {
      return res.json({ precio: 0, resultados: 0 });
    }

    const muestra = precios.slice(0, 10);
    const media = Math.round(muestra.reduce((a, b) => a + b, 0) / muestra.length);

    res.json({ precio: media, resultados: precios.length });

  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Toydoki corriendo en puerto ${PORT}`);
});
