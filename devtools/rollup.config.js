import resolve from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
// import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/index.ts',
  output: {
    format: 'iife',
    file: '_dev/devtools.js',
    sourcemap: 'inline',
  },
  plugins: [
    resolve({
      extensions: ['.ts', '.js'],
    }),
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env', '@babel/preset-typescript'],
      plugins: [
        [
          '@babel/plugin-proposal-class-properties',
          {
            loose: true,
          },
        ],
      ],
      exclude: 'node_modules/**',
      extensions: ['.ts', '.js'],
    }),
  ],
}
