/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const axeCore = require('axe-core');

(async () => {
  const url = process.argv[2] || 'http://localhost:3000';
  const outFile = process.argv[3] || 'a11y-report.json';

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    // inject axe
    await page.addScriptTag({ content: axeCore.source });
    const results = await page.evaluate(async () => {
      return await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa'] } });
    });

    const fs = require('fs');
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log('A11Y audit completed. Results saved to', outFile);
    console.log('Violations:', results.violations.length);
    results.violations.forEach((v, i) => {
      console.log(`\n${i+1}) ${v.id} — ${v.impact} — ${v.help}`);
      v.nodes.slice(0,3).forEach((n,j)=>{
        console.log(`   - target[${j}]:`, n.target.join(' | '));
      });
    });
  } catch (err) {
    console.error('Audit failed:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
