// Mechanical extraction of the public seed catalogue embedded in index.html.
const fs = require('node:fs');
const path = require('node:path');
const directory = __dirname;
const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
const start = html.indexOf('var Mb=') + 'var Mb='.length;
const end = html.indexOf(';var ci=', start);
if (start < 'var Mb='.length || end < 0) throw new Error('Seed catalogue not found');
const products = Function(`return (${html.slice(start, end)})`)();
if (!Array.isArray(products) || !products.length || products.some(p => !p.id || !p.name)) {
  throw new Error('Invalid seed catalogue');
}
fs.writeFileSync(path.join(directory, 'catalog-default.json'), JSON.stringify(products));
console.log(`Extracted ${products.length} public products`);
