// Custom rollup plugin for creating html pages
import { readFileSync } from 'fs';
import mustache from 'mustache';
import { findHashFromName } from './bundle-utils';
import { version } from '../package.json';

function generateShell(bundle, { templatePath, isDev }) {
  const template = readFileSync(templatePath, 'utf8');
  return mustache.render(template, {
    isProduction: !isDev,
    isDev,
    scriptFile: findHashFromName(bundle, 'main'),
    title: 'COVID map',
    version,
  });
}

export default function createHTMLPlugin({ isDev }) {
  const templatePath = 'src/index.mustache';
  return {
    name: 'create-html-plugin',
    buildStart() {
      this.addWatchFile(templatePath);
    },
    async generateBundle(options, bundle) {
      bundle['index.html'] = {
        fileName: 'index.html',
        isAsset: true,
        source: await generateShell(bundle, { templatePath, isDev }),
      };
      // 404.html is a 'magic' file for http-server so local dev
      // SPA works
      if (isDev) {
        bundle['404.html'] = {
          fileName: '404.html',
          isAsset: true,
          source: await generateShell(bundle, { templatePath, isDev }),
        };
      }
    },
  };
}
