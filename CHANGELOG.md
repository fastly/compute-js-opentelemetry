# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]

## [0.2.2] - 2023-1-08

### Updated 

- Apply "Compute" branding change.

## [0.2.1] - 2023-10-12

### Added

- Added README demo example in TypeScript
- Added Basic Tracing TypeScript example
- Added TypeScript tips to README

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

[unreleased]: https://github.com/fastly/compute-js-opentelemetry/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/fastly/compute-js-opentelemetry/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/fastly/compute-js-opentelemetry/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/fastly/compute-js-opentelemetry/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/fastly/compute-js-opentelemetry/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/fastly/compute-js-opentelemetry/releases/tag/v0.1.0
