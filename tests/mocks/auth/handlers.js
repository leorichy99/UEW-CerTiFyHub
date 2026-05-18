/**
 * MSW handlers for authentication API endpoints
 */

import { http, HttpResponse } from 'msw';

export const authHandlers = [
  // POST /api/login/ - Login
  http.post('/api/login/', async ({ request }) => {
    const data = await request.json();
    
    // Mock successful login
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        username: data.username,
        email: `${data.username}@example.com`,
        profile: {
          role: 'ADMIN',
          permissions: {
            can_view_certificates: true,
            can_create_certificates: true,
            can_delete_certificates: false,
          },
        },
      },
    });
  }),
  
  // POST /api/logout/ - Logout
  http.post('/api/logout/', () => {
    return HttpResponse.json({ detail: 'Successfully logged out' });
  }),
  
  // POST /api/password/reset/ - Password reset request
  http.post('/api/password/reset/', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({
      detail: 'Password reset email sent',
      email: data.email,
    });
  }),
];
