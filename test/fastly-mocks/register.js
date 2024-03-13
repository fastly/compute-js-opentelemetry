/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { register } from 'node:module';
register('./hooks.js', import.meta.url);
