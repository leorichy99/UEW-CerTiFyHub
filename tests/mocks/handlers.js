/**
 * Central MSW handlers - exports all feature handlers
 */

import { dashboardHandlers } from './dashboard/handlers.js';
import { certificatesHandlers } from './certificates/handlers.js';
import { authHandlers } from './auth/handlers.js';

export const handlers = [
  ...dashboardHandlers,
  ...certificatesHandlers,
  ...authHandlers,
];
