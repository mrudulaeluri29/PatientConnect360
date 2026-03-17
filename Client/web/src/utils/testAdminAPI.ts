// Test script to check the admin API endpoints
import { api } from '../lib/axios';

async function testAdminAPIs() {
  try {
    console.log('🧪 Testing Admin API Endpoints...\n');

    // Test 1: Get all users
    console.log('1️⃣ Testing /admin/users');
    try {
      const allUsersResponse = await api.get('/admin/users');
      console.log('✅ All users:', allUsersResponse.data);
    } catch (error: any) {
      console.log('❌ All users error:', error.response?.data || error.message);
    }

    // Test 2: Get patients by role
    console.log('\n2️⃣ Testing /admin/users/by-role?role=patient');
    try {
      const patientsResponse = await api.get('/admin/users/by-role', {
        params: { role: 'patient' }
      });
      console.log('✅ Patients:', patientsResponse.data);
    } catch (error: any) {
      console.log('❌ Patients error:', error.response?.data || error.message);
    }

    // Test 3: Get clinicians by role
    console.log('\n3️⃣ Testing /admin/users/by-role?role=clinician');
    try {
      const cliniciansResponse = await api.get('/admin/users/by-role', {
        params: { role: 'clinician' }
      });
      console.log('✅ Clinicians:', cliniciansResponse.data);
    } catch (error: any) {
      console.log('❌ Clinicians error:', error.response?.data || error.message);
    }

    // Test 4: Get messages
    console.log('\n4️⃣ Testing /admin/messages');
    try {
      const messagesResponse = await api.get('/admin/messages');
      console.log('✅ Messages:', messagesResponse.data);
    } catch (error: any) {
      console.log('❌ Messages error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('🚨 Test failed:', error);
  }
}

// Export for use in console
(window as any).testAdminAPIs = testAdminAPIs;

console.log('🛠️ Admin API Tester loaded. Run testAdminAPIs() in console to test.');