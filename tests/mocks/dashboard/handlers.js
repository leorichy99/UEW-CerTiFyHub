/**
 * MSW handlers for dashboard API endpoints
 */

import { http, HttpResponse } from 'msw';
import dashboardStats from '../../fixtures/frontend/dashboard-stats.json';

export const dashboardHandlers = [
  // GET /analytics/stats/ - Dashboard statistics
  http.get('/analytics/stats/', () => {
    return HttpResponse.json(dashboardStats);
  }),
  
  // GET /analytics/stats/ with refresh parameter
  http.get('/analytics/stats/', ({ request }) => {
    const url = new URL(request.url);
    const silent = url.searchParams.get('silent');
    
    return HttpResponse.json(dashboardStats);
  }),
];
