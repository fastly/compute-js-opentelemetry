# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]

### Fixed

- webpack-helpers: Correctly override loaders

### Internal

- Update to `@fastly/js-compute`@`3.6.2`

## [0.2.0] - 2023-09-19

### Fixed

- Global `document` object returns `undefined` rather than `null`, fixes a problem caused by `is-callable` dependency.
- Fix metrics exporting code incorrectly attempting to use browser features to send metrics.

### Added

- Requires at least @fastly/js-compute@2, with support for @fastly/js-compute@3
- Metrics
- Supports performance API, for higher resolution timestamps
- Support for Async Resource Attributes

### Removed

- Removed `FastlySpanProcessor`, as `BatchSpanProcessor` can be used.
- Remove mainFields fix for webpack helpers as it is no longer necessary

### Changed

- Support for updated OpenTelemetry libraries:
  - OpenTelemetry API version 1.4.x
  - Core implementations at 1.14.x
  - Experimental modules at 0.40.x
- Updated to TypeScript@5
- Switch to npm from yarn

## [0.1.3] - 2022-09-06

### Changed

- Updated @fastly/js-compute@0.5.2
- Removed unnecessary polyfills for `console` methods. 

## [0.1.2] - 2022-06-29

### Changed

- Updated @fastly/js-compute@0.2.5
- Removed unnecessary polyfills for types. 

## [0.1.1] - 2022-06-07

## [0.1.0] - 2022-06-01

- Initial release

[unreleased]: https://github.com/fastly/compute-js-opentelemetry/compare/0.2.0...HEAD
[0.2.0]: https://github.com/fastly/compute-js-opentelemetry/compare/0.1.0...v0.2.0
[0.1.0]: https://github.com/fastly/compute-js-opentelemetry/releases/tag/0.1.0
