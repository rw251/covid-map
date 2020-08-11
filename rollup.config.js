import nodeResolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import commonjs from '@rollup/plugin-commonjs';
import babel from 'rollup-plugin-babel';
import rimraf from 'rimraf';
import { join } from 'path';
import { terser } from 'rollup-plugin-terser';
import createHTMLPlugin from './lib/create-html';

const distDir = join('public_html', 'covid');
// Remove ./dist
rimraf.sync(distDir);

function buildConfig({ watch } = {}) {
  const isDev = watch;

  return {
    input: {
      main: 'src/index.js',
    },
    output: {
      dir: distDir,
      format: 'iife',
      sourcemap: watch || 'hidden',
      entryFileNames: '[name]-[hash].js',
      chunkFileNames: '[name]-[hash].js',
    },
    watch: { clearScreen: false },
    plugins: [
      // resolves in-built node packages like https / fs etc..
      nodeResolve({
        preferBuiltins: true,
        mainFields: ['browser', 'module', 'main'],
      }),

      commonjs(), // allows import to work with commonjs modules that do a module.exports
      // globals(),
      // builtins(),
      babel({ exclude: 'node_modules/**' }),
      !isDev && terser(), // uglify the code if not dev mode
      createHTMLPlugin({ isDev }), // create the index.html
      copy({
        targets: [
          { src: 'src/static/*', dest: distDir, dot: true },
          { src: 'data/*', dest: distDir, dot: true },
        ],
      }),
    ].filter((item) => item), // filter out unused plugins by filtering out false and null values
  };
}

export default function ({ watch }) {
  return [buildConfig({ watch })];
}
