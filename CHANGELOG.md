# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]

### Removed

- Remove mainFields fix for webpack helpers as it is no longer necessary

## [0.2.0-alpha.3] - 2023-06-14

### Changed

- Support for updated OpenTelemetry libraries:
  - OpenTelemetry API version 1.4.x
  - Core implementations at 1.14.x
  - Experimental modules at 0.40.x

### Removed

- Removed `FastlySpanProcessor`, as `BatchSpanProcessor` can be used.

## [0.2.0-alpha.2] - 2023-06-13

### Added

- Requires @fastly/js-compute@2.3.0
- Supports performance API, for higher resolution timestamps
- Support for Async Resource Attributes

## [0.2.0-alpha.1] - 2023-06-02

### Added

- Support for @fastly/js-compute@2.0.2
- Support for updated OpenTelemetry libraries:
  - OpenTelemetry API version 1.4.x
  - Core implementations at 1.13.x
  - Experimental modules at 0.39.x
- Updated to TypeScript@5
- Switch to npm from yarn
- Metrics

### Fixed

- Global `document` object returns `undefined` rather than `null`, fixes a problem caused by `is-callable` dependency.
- Fix metrics exporting code incorrectly attempting to use browser features to send metrics.

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

[unreleased]: https://github.com/fastly/compute-js-opentelemetry/compare/0.2.0-alpha.3...HEAD
[0.2.0-alpha.3]: https://github.com/fastly/compute-js-opentelemetry/compare/0.1.0...v0.2.0-alpha.3
[0.1.0]: https://github.com/fastly/compute-js-opentelemetry/releases/tag/0.1.0
