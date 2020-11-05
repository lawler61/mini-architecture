import resolve from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import image from '@rollup/plugin-image'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'
// import analyzer from "rollup-plugin-analyzer";
import path from 'path'
import config from './package.json'
import fs from 'fs-extra'
import chalk from 'chalk'
chalk.level = 3

const rootPath = path.join(__dirname, '..')
const isDev = process.env.ROLLUP_WATCH
const bootFromRoot = process.env.BOOT_ENV === 'root'

const defaultPlugins = [
  resolve(),
  json(),
  image(),
  commonjs(),
  babel({
    babelHelpers: 'bundled',
    exclude: 'node_modules/**',
    presets: [
      [
        '@babel/preset-env',
        {
          corejs: 3,
          modules: false,
          // global usage
          useBuiltIns: 'usage',
          targets: {
            browsers: ['Android >= 4.4', 'ChromeAndroid >= 62', 'iOS >= 9'],
          },
        },
      ],
    ],
    // pure usage
    // plugins: [
    //   '@babel/transform-runtime',
    //   {
    //     corejs: 3,
    //     ...
    //   },
    // ],
  }),
  replace({
    __INSERT_TEXT__: JSON.stringify(
      fs.readFileSync(__dirname + '/webview/components/reset.css', 'utf-8'),
    ),
    __VERSION__: config.version,
  }),
  myPlugin(),
]

const generateEntry = ({ name, sourcemap = 'inline', outputName, plugins = defaultPlugins }) => {
  return {
    input: `${name}/index.js`,
    output: {
      file: `dist/${outputName || name}.js`,
      format: 'iife',
      sourcemap,
    },
    plugins,
  }
}

export default [
  generateEntry({
    name: 'webview',
    outputName: isDev ? '' : 'webview.dev',
  }),
  generateEntry({
    name: 'service',
    outputName: isDev ? '' : 'service.dev',
  }),
  // build mode
  !isDev &&
    generateEntry({
      name: 'webview',
      sourcemap: true,
      plugins: [...defaultPlugins, terser()],
    }),
  !isDev &&
    generateEntry({
      name: 'service',
      sourcemap: true,
      plugins: [...defaultPlugins, terser()],
    }),
].filter(Boolean)

let count = 0

function myPlugin() {
  return {
    name: 'dev-plugin',
    options(options) {
      bootFromRoot &&
        console.log(
          chalk.cyan(`[rollup] bundles ${options.input} → ${options.output[0].file}...\n`),
        )
    },
    // pack 中 nodemon watch ../framework 有问题，暂时没其他办法
    buildEnd() {
      if (!isDev) return
      const _dev = path.join(rootPath, 'pack/_dev.js')

      !fs.existsSync(_dev) && fs.createFile(_dev)

      if (count++ !== 0) {
        fs.writeFileSync(_dev, `update: ${count}`, { encoding: 'utf-8' })
      } else {
        count++
      }
    },
    outputOptions(options) {
      if (!bootFromRoot) return
      console.log(chalk.cyan(`[rollup] created ${options.file}\n`))
      isDev && count > 2 && console.log('[rollup] waiting for changes...\n')
    },
  }
}
