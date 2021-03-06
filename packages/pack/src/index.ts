import path from 'path'
import fs from 'fs-extra'
import archiver from 'archiver'
import chalk from 'chalk'
import builder from './build'
import { normalizePath, normalizeBoolean } from '@mini-architecture/utils'

const maPath = path.join(__dirname, '../..')
const miniPath = normalizePath('MINI_ENTRY', path.join(maPath, 'mini/dist'))
const frameworkPath = normalizePath('MINI_FRAMEWORK', path.join(maPath, 'framework/dist'))
const outputPath = normalizePath('MINI_OUTPUT', path.join(maPath, 'android/app/src/main/assets'))
const isCli = normalizeBoolean('MINI_BY_CLI', false)
const isZip = normalizeBoolean('MINI_ZIP', true)

export default async function pack() {
  try {
    await packFramework()
    await packMini()
  } catch (err) {
    if (typeof err === 'string') {
      console.log(err)
      return
    }
    throw err
  }
}

async function packFramework() {
  const name = `framework${isZip ? '.zip' : ''}`
  const to = path.join(outputPath, name)

  // 第一次直接返回
  if (
    !fs.existsSync(path.join(frameworkPath, 'webview.js')) ||
    !fs.existsSync(path.join(frameworkPath, 'service.js'))
  ) {
    // by cli
    throw process.env.MINI_ENTRY ? new Error('invalid framework path...') : 'first pack...'
  }

  let config: any = null
  if (isZip) {
    // move from 'framework/_framework.zip' to 'android/app/src/main/assets/framework.zip'
    const fromPath = await zipFiles(frameworkPath, name)
    config = { from: fromPath, to }
  } else {
    // copy from 'framework/dist' to 'android/app/src/main/assets/framework'
    config = { from: frameworkPath, to, copy: true }
  }

  return handleFiles(config)
}

async function packMini() {
  const name = `miniDemo${isZip ? '.zip' : ''}`
  const temp = path.join(maPath, 'pack/_temp')
  const to = path.join(outputPath, process.env.MINI_PLATFORM === 'devtools' ? 'apps' : '', name)
  const miniConfig = JSON.parse(fs.readFileSync(path.join(miniPath, 'app.json'), 'utf-8'))

  fs.existsSync(temp) && fs.removeSync(temp)

  builder.transform({
    miniPath,
    frameworkPath,
    templatePath: path.join(maPath, 'pack/templates'),
    output: temp,
    miniConfig,
  })
  copyOthers(miniPath, temp)

  let config: any = null
  if (isZip) {
    // move from 'pack/_miniDemo.zip to 'android/app/src/main/assets/miniDemo.zip'
    const fromPath = await zipFiles(temp, name)
    config = { from: fromPath, to }
  } else {
    // move from 'pack/_temp' to 'android/app/src/main/assets/miniDemo'
    config = { from: temp, to }
  }

  return handleFiles(config)
}

function copyOthers(source: string, targetPath: string) {
  const exclude = ['.js', '.html', '.css']

  fs.copySync(source, targetPath, {
    filter(src) {
      if (fs.lstatSync(src).isDirectory()) return true
      if (src.includes('app.json')) return false
      return !exclude.some(ext => ext === path.extname(src))
    },
  })
}

function zipFiles(sourcePath: string, name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 },
    })
    const output = path.join(sourcePath, `../_${name}`)
    const stream = fs.createWriteStream(output)

    stream.on('close', () => {
      const size = archive.pointer()
      console.log(
        `${isCli ? chalk.blue('\n[ma-cli]: ') : ''}zip ${name}, ${(size / 1024).toFixed(3)} kb...`,
      )
      resolve(output)
    })

    archive.on('warning', err => {
      if (err.code === 'ENOENT') {
      } else {
        throw err
      }
    })

    archive.on('error', err => {
      reject(err)
      throw err
    })

    archive.pipe(stream)
    archive.directory(sourcePath, false)
    archive.finalize()
  })
}

async function handleFiles(config: {
  from: string
  to: string
  copy?: boolean
}): Promise<{ from: string; to: string }> {
  const { from, to, copy = false } = config
  fs.existsSync(to) && fs.removeSync(to)

  return fs[copy ? 'copy' : 'move'](from, to).then(() => {
    console.log(`${isCli ? chalk.blue('\n[ma-cli]: ') : ''}create ${to}...`)
    return { from, to }
  })
}
