/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import path from "path";
import { Configuration, ProvidePlugin } from "webpack";

// Replace some files in /platform/browser with shims in /platform/compute-js
const platformReplacements = [
  {
    regex: /.*\/@opentelemetry\/core\/build\/src\/platform\/browser\//,
    replacementPath: path.resolve(__dirname, "./shims/core/platform/compute-js/"),
  }
];

// Load /platform/node of thees modules instead of /platform/browser
function buildModuleRegex(moduleName: string) {
  return new RegExp('.*/' + moduleName);
}
const disableAliasFieldsRegexes = [
  buildModuleRegex('@opentelemetry/otlp-exporter-base'),
  buildModuleRegex('@opentelemetry/exporter-trace-otlp-http'),
];

export function apply(webpackConfig: Configuration): Configuration {

  // Modify the stock webpack config generated by the compute@edge starter

  return Object.assign({},
    webpackConfig,
    {
      experiments: {
        topLevelAwait: true
      },
      resolve: {
        ...(webpackConfig?.resolve ?? {}),
        alias: {
          "document": path.resolve(__dirname, "./shims/document"),
          "process": path.resolve(__dirname, "./shims/process"),
          "perf_hooks": path.resolve(__dirname, "./shims/perf_hooks"),
        },
        fallback: {
          "assert": require.resolve("assert/"),
          "buffer": require.resolve("buffer/"),
          "http": false,
          "https": false,
          "stream": require.resolve("stream-browserify"),
          "timers": require.resolve("timers-browserify"),
          "url": false,
          "util": require.resolve("util/"),
          "zlib": require.resolve("browserify-zlib"),
        },
      },
      module: {
        rules: [
          {
            test: (resource: string) => {
              return disableAliasFieldsRegexes.some(
                regex => regex.test(resource)
              );
            },
            resolve: {
              aliasFields: [],
            },
          },
          {
            test: (resource: string) => {
              return platformReplacements.some(
                platformReplacement => platformReplacement.regex.test(resource)
              );
            },
            use: [
              {
                loader: 'file-replace-loader',
                options: {
                  replacement(resourcePath: string): string {
                    const platformReplacement =
                      platformReplacements.find(def => def.regex.test(resourcePath));
                    if(platformReplacement == null) {
                      return resourcePath;
                    }
                    const fileName = resourcePath.replace(platformReplacement.regex,'');
                    return path.join(platformReplacement.replacementPath, fileName);
                  },
                }
              },
            ],
          }
        ],
      },
      plugins: [
        ...(webpackConfig?.plugins ?? []),
        new ProvidePlugin({
          process: "process",
          performance: [ "perf_hooks", "performance" ],
          document: [ "document", "document" ],
        })
      ],
    });

}
