#! /usr/bin/env node

const nodemon = require('nodemon')
const Bundler = require('parcel-bundler')
const path = require('path')

process.env.DEVTOOLS_ENV = 'develop'

// https://en.parceljs.org/api.html
const bundler = new Bundler(path.resolve('./client/index.html'), {
  watch: true,
  outDir: 'dev/client',
})
bundler.on('bundled', () => {})
bundler.on('buildEnd', () => {})

bundler.bundle().then(bundle => {
  // https://github.com/remy/nodemon/pull/1077. Why you didn't merge
  process.env.NODEMON_PROCESS_STAGE = 1
  // use nodemon.json
  nodemon({})
    .on('start', () => {})
    .once('restart', () => {
      process.env.NODEMON_PROCESS_STAGE = 2
    })
})