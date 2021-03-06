import { types as t, parse, traverse, transform } from '@babel/core'
import { default as generator } from '@babel/generator' // by @babel/core
import fs from 'fs-extra'
import Concat from 'concat-with-sourcemaps'
import presetEnv from '@babel/preset-env'
import presetMinify from 'babel-preset-minify'

const isDev = process.env.MINI_ENV !== 'build'
const PREFIX_ELEMENT = 'ma-'
const PREFIX_BIND = 'bind'
const PREFIX_EVENT = '_bind'
const REG_DYNAMIC = /\{\{([^}]+)\}\}/g
const dynamicMap = {}

interface ParserConfig {
  fullPath: string
  page?: string
}

export interface ParseResult {
  code: string | Buffer
  js?: string
  map?: string
}

export default function parseFile(params: ParserConfig) {
  const { fullPath, page = '' } = params
  const output = fs.readFileSync(fullPath, 'utf-8')
  const isJsx = /\.html$/.test(fullPath)
  let result: ParseResult | null = null

  if (isJsx) {
    const ast = parse(output, {
      parserOpts: {
        plugins: ['jsx'],
      },
    })

    traverse(ast, {
      JSXIdentifier(path) {
        const { parent, node } = path
        // 1. tags <view> or </view>
        if (t.isJSXOpeningElement(parent) || t.isJSXClosingElement(parent)) {
          if (['view', 'button'].includes(node.name)) {
            node.name = PREFIX_ELEMENT + node.name
          } else {
            node.name = PREFIX_ELEMENT + 'view'
          }
        } else if (t.isJSXAttribute(parent)) {
          // 2. attrs

          // attr value is object or boolean attr
          if (!t.isStringLiteral(parent.value) || !parent.value) return
          const attr = node.name
          const { value } = parent.value

          if (REG_DYNAMIC.test(value)) {
            const newValue = value.replace(REG_DYNAMIC, (_s, cnt) => {
              cnt = cnt.replace(/\s/g, '')
              addDynamicValue(page, 'data', cnt)
              return `{{${cnt}}}`
            })
            // NOTE: 懒得判断是 attr or property
            parent.name.name += '$'
            parent.value.value = newValue
          } else if (attr.startsWith(PREFIX_BIND)) {
            // 3. event
            const name = PREFIX_EVENT + value
            addDynamicValue(page, 'event', name)
            // https://polymer-library.polymer-project.org/3.0/docs/devguide/data-binding
            parent.value.value = `[[${name}]]`
          }
        }
      },
      JSXExpressionContainer(path) {
        // 4. children

        if (
          // attr value is object
          !t.isJSXElement(path.parent) ||
          // {}
          !path.node.expression.properties ||
          // {{ a, b }}
          path.node.expression.properties.length > 1
        )
          return

        const property = path.node.expression.properties[0]
        const value = property.value.name
        // {{ a: b }}
        if (property.key.name !== value) return

        addDynamicValue(page, 'data', value)
        // path.replaceWith(t.JSXText(key))
      },
    })

    const { code } = generator(ast, { minified: !isDev, comments: isDev })
    const jsCode = genJsCode(dynamicMap[page].event)
    // why you end with ";"
    result = { code: code.slice(0, -1), js: jsCode }
  } else {
    const source = transform(output, {
      // isJsx && ['@babel/preset-react', { pragma: '_l' }]
      // 直接获取本地依赖，相对引用会有问题
      presets: [presetEnv, !isDev && presetMinify].filter(Boolean),
      sourceMaps: isDev,
      sourceRoot: process.cwd(),
      sourceFileName: fullPath,
      babelrc: false,
      ast: false,
    })

    const shortPath = getShortPath(fullPath)
    const concat = new Concat(true, shortPath, '\n')
    concat.add(
      null,
      `define("${shortPath}", function(require,module,exports,window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,fetch,XMLHttpRequest,WebSocket,webkit,jsCore,jSBridge) {`,
    )
    concat.add(shortPath, source.code, source.map)
    concat.add(null, '});' + `require("${shortPath}");`)

    result = {
      code: concat.content,
      map: concat.sourceMap,
    }
  }

  // console.log(result.code)
  return result
}

function addDynamicValue(page: string, type: 'data' | 'event', value: string) {
  if (!dynamicMap[page]) {
    dynamicMap[page] = {
      data: new Set<string>(),
      event: new Set<string>(),
    }
  }
  dynamicMap[page][type].add(value)
}

function genJsCode(events: string[]) {
  return [...events].reduce((tpl, name, i, arr) => {
    tpl += `_binder["${name}"] = function(ev) {
      window.ma.publishPageEvent("${name.slice(PREFIX_EVENT.length)}", ev)
    };`
    if (i === arr.length - 1) {
      tpl += 'Object.assign(_binder, window.ma.data || {});}'
    }
    return tpl
  }, 'function _bindData() {')
}

function getShortPath(path: string) {
  const arr = path.split('/')
  const idx = arr.findIndex(dir => dir === 'mini')
  return arr.slice(idx).join('/')
}
