/**
 * MSW handlers for certificates API endpoints
 */

import { http, HttpResponse } from 'msw';
import certificatesList from '../../fixtures/frontend/certificates-list.json';

export const certificatesHandlers = [
  // GET /api/certificates/ - List certificates
  http.get('/api/certificates/', () => {
    return HttpResponse.json(certificatesList);
  }),
  
  // GET /api/certificates/:id/ - Get certificate details
  http.get('/api/certificates/:id/', ({ params }) => {
    const certificate = certificatesList.results.find(c => c.id === params.id);
    if (!certificate) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(certificate);
  }),
  
  // POST /api/certificates/ - Create certificate
  http.post('/api/certificates/', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({
      id: 'cert-new',
      ...data,
      certificate_number: `UEW/2024/${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      generated_date: new Date().toISOString(),
    }, { status: 201 });
  }),
];
