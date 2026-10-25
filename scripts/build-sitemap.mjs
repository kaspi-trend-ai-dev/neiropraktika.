import fs from 'node:fs';
import path from 'node:path';

const base='https://kaspi-trend-ai-dev.github.io/neiropraktika./';
const basePaths=['','prompty-chatgpt.html','rezume-chatgpt.html','tovar-chatgpt.html'];
const articleDir='articles';
const articlePaths=fs.existsSync(articleDir)?
  fs.readdirSync(articleDir).filter(name=>name.endsWith('.html')).sort().map(name=>path.posix.join(articleDir,name)):[];
const urls=[...basePaths,...articlePaths].map(p=>base+p);
const escapeXml=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 urls.map(url=>'  <url><loc>'+escapeXml(url)+'</loc></url>').join('\n')+
 '\n</urlset>\n';
fs.writeFileSync('sitemap.xml',xml);
console.log('Sitemap generated:',urls.length,'URLs');
