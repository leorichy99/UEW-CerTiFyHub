#!/usr/bin/env node

import https from 'node:https';

const API_BASE = 'http://localhost:8000/api';

const SUPER_ADMIN = {
  username: 'sadmin@uew.edu.gh',  // Backend expects 'username' field
  email: 'sadmin@uew.edu.gh',
  full_name: 'Super Admin',
  password: 'sadmin@26',
  password_confirm: 'sadmin@26',  // Backend requires password confirmation
  // role: 'staff',  // Try without role field first
};

async function testBackend() {
  try {
    console.log('🔍 Testing backend connection...');
    const response = await fetch(`${API_BASE}/`);
    console.log(`✅ Backend reachable (status: ${response.status})`);
    return true;
  } catch (err) {
    console.error('❌ Backend not reachable:', err.message);
    console.error('   Please start Django backend: python manage.py runserver');
    return false;
  }
}

async function createSuperAdmin() {
  try {
    console.log('\n🔐 Creating Super Admin account...');
    console.log(`Email: ${SUPER_ADMIN.email}`);
    console.log(`Password: ${SUPER_ADMIN.password.replace(/./g, '*')}`);

    const response = await fetch(`${API_BASE}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(SUPER_ADMIN),
    });

    const responseText = await response.text();
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📡 Response body: ${responseText}`);

    if (!response.ok) {
      console.error('❌ Failed to create Super Admin');
      if (response.status === 400) {
        console.error('   This might mean the user already exists or validation failed');
      }
      return false;
    }

    const result = JSON.parse(responseText);
    console.log('✅ Super Admin created successfully!');
    console.log(`👤 Email: ${result.email || SUPER_ADMIN.email}`);
    console.log(`🔑 Role: ${result.role || SUPER_ADMIN.role}`);
    return true;

  } catch (err) {
    console.error('❌ Error creating Super Admin:', err.message);
    return false;
  }
}

async function testLogin() {
  try {
    console.log('\n🔑 Testing login...');
    const response = await fetch(`${API_BASE}/auth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: SUPER_ADMIN.email,
        password: SUPER_ADMIN.password,
      }),
    });

    const responseText = await response.text();
    console.log(`📡 Login response status: ${response.status}`);
    console.log(`📡 Login response body: ${responseText}`);

    if (!response.ok) {
      console.error('❌ Login failed');
      return false;
    }

    const result = JSON.parse(responseText);
    console.log('✅ Login successful!');
    console.log(`🎫 Access token received: ${result.access ? 'YES' : 'NO'}`);
    return true;

  } catch (err) {
    console.error('❌ Error testing login:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Super Admin Setup Script');
  console.log('========================\n');

  const backendOk = await testBackend();
  if (!backendOk) {
    process.exit(1);
  }

  const created = await createSuperAdmin();
  if (!created) {
    console.log('\n⚠️  Super Admin creation failed, but trying login anyway...');
  }

  const loginOk = await testLogin();
  if (!loginOk) {
    console.log('\n❌ Setup failed. Check backend logs for details.');
    process.exit(1);
  }

  console.log('\n🎉 Setup complete! You can now log in at:');
  console.log('   Frontend: http://localhost:3000/login');
  console.log('   Django Admin: http://localhost:8000/admin');
  console.log('\n📝 Credentials:');
  console.log(`   Email: ${SUPER_ADMIN.email}`);
  console.log(`   Password: ${SUPER_ADMIN.password}`);
}

main().catch(console.error);
