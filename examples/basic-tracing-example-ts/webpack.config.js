import path from "path";
import url from "url";

import webpackHelpers from "@fastly/compute-js-opentelemetry/webpack-helpers";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

let config = {
  mode: 'production',
  entry: "./src/index.ts",
  optimization: {
    // Set to false if you wish to be able to read
    // the minified code that will be generated at ./bin/index.js,
    // useful for debugging purposes.
    minimize: false,
  },
  target: "webworker",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "bin"),
    libraryTarget: "this",
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'],
    // Add support for TypeScripts fully qualified ESM imports.
    extensionAlias: {
      '.js': ['.js', '.ts'],
      '.cjs': ['.cjs', '.cts'],
      '.mjs': ['.mjs', '.mts'],
    },
  },
  module: {
    rules: [
      // Loaders go here.
      // e.g., ts-loader for TypeScript
      {
        test: /\.([cm]?ts|tsx)$/,
        loader: 'ts-loader',
      }
    ],
  },
  plugins: [
    // Polyfills go here.
    // Used for, e.g., any cross-platform WHATWG,
    // or core nodejs modules needed for your application.
    // new webpack.ProvidePlugin({
    // }),
  ],
  externals: [
    ({request,}, callback) => {
      // Allow Webpack to handle fastly:* namespaced module imports by treating
      // them as modules rather than try to process them as URLs
      if (/^fastly:.*$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ],
  performance: {
    hints: false,
  },
};

config = webpackHelpers.apply(config);

export default config;
