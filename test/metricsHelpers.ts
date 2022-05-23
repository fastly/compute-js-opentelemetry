/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ValueType } from "@opentelemetry/api-metrics";
import { Resource } from "@opentelemetry/resources";
import { DataPointType, InstrumentType, ResourceMetrics } from "@opentelemetry/sdk-metrics-base";

export const mockResourceMetrics: ResourceMetrics = {
  resource: new Resource({}),
  instrumentationLibraryMetrics: [
    {
      instrumentationLibrary: {
        name: 'foo',
        version: '0.1.0',
        schemaUrl: 'https://www.foo.com/path/',
      },
      metrics: [
        {
          descriptor: {
            name: 'bar',
            description: 'bar instrument',
            unit: 'moo',
            type: InstrumentType.COUNTER,
            valueType: ValueType.DOUBLE,
          },
          dataPointType: DataPointType.SINGULAR,
          dataPoints: [
            {
              startTime: [1609504210, 150000000],
              endTime: [1609504210, 150000000],
              attributes: { 'baz': 'yo' },
              value: 1,
            },
            {
              startTime: [1609504210, 150000000],
              endTime: [1609504210, 150000000],
              attributes: { 'baz': 'ho' },
              value: 4,
            },
          ],
        },
      ],
    },
  ],
};
