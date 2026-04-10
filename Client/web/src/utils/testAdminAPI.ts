// Test script to check the admin API endpoints
import { api } from '../lib/axios';

function testApiErrorDetails(error: unknown): unknown {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (data !== undefined) return data;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

async function testAdminAPIs() {
  try {
    console.log('🧪 Testing Admin API Endpoints...\n');

    // Test 1: Get all users
    console.log('1️⃣ Testing /admin/users');
    try {
      const allUsersResponse = await api.get('/admin/users');
      console.log('✅ All users:', allUsersResponse.data);
    } catch (error: unknown) {
      console.log('❌ All users error:', testApiErrorDetails(error));
    }

    // Test 2: Get patients by role
    console.log('\n2️⃣ Testing /admin/users/by-role?role=patient');
    try {
      const patientsResponse = await api.get('/admin/users/by-role', {
        params: { role: 'patient' }
      });
      console.log('✅ Patients:', patientsResponse.data);
    } catch (error: unknown) {
      console.log('❌ Patients error:', testApiErrorDetails(error));
    }

    // Test 3: Get clinicians by role
    console.log('\n3️⃣ Testing /admin/users/by-role?role=clinician');
    try {
      const cliniciansResponse = await api.get('/admin/users/by-role', {
        params: { role: 'clinician' }
      });
      console.log('✅ Clinicians:', cliniciansResponse.data);
    } catch (error: unknown) {
      console.log('❌ Clinicians error:', testApiErrorDetails(error));
    }

    // Test 4: Get messages
    console.log('\n4️⃣ Testing /admin/messages');
    try {
      const messagesResponse = await api.get('/admin/messages');
      console.log('✅ Messages:', messagesResponse.data);
    } catch (error: unknown) {
      console.log('❌ Messages error:', testApiErrorDetails(error));
    }

  } catch (error) {
    console.error('🚨 Test failed:', error);
  }
}

// Export for use in console
const w = window as Window & { testAdminAPIs?: typeof testAdminAPIs };
w.testAdminAPIs = testAdminAPIs;

console.log('🛠️ Admin API Tester loaded. Run testAdminAPIs() in console to test.');
