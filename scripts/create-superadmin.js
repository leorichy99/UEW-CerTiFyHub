#!/usr/bin/env node

import https from 'node:https';

const API_BASE = 'http://localhost:8000/api';

const SUPER_ADMIN = {
  email: 'sadmin@uew.edu.gh',
  full_name: 'Super Admin',
  password: 'sadmin@26',
  role: 'SUPER_ADMIN',
};

async function createSuperAdmin() {
  try {
    console.log('🔐 Creating Super Admin account...');
    console.log(`Email: ${SUPER_ADMIN.email}`);
    console.log(`Name: ${SUPER_ADMIN.full_name}`);
    console.log(`Password: ${SUPER_ADMIN.password.replace(/./g, '*')}`);

    const response = await fetch(`${API_BASE}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      // Add CSRF token if needed
        // 'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify(SUPER_ADMIN),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📡 Raw response body:', responseText);

    if (!response.ok) {
      console.error('❌ Failed to create Super Admin. Status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.error('❌ Parsed error:', errorData);
      } catch (e) {
        console.error('❌ Could not parse error response:', responseText);
      }
      process.exit(1);
    }

    const result = JSON.parse(responseText);
    console.log('✅ Super Admin created successfully!');
    console.log('👤 User:', result.email);
    console.log('🔑 Role:', result.role);
    console.log('🆔 ID:', result.id);
    console.log('\n🚀 You can now log in at:');
    console.log('   Frontend: http://localhost:3000/login');
    console.log('   Django Admin: http://localhost:8000/admin');
    console.log('\n⚠️  Store these credentials securely!');
    console.log('   Email:', SUPER_ADMIN.email);
    console.log('   Password:', SUPER_ADMIN.password);

  } catch (err) {
    console.error('❌ Network or server error:', err.message);
    process.exit(1);
  }
}

// Simple CSRF token helper (adjust if your backend uses a different pattern)
function getCsrfToken() {
  // Try to get from meta tag if running in browser context
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }
  return '';
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSuperAdmin();
}

export { createSuperAdmin };
