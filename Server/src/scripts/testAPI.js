// Test script to call the API endpoint directly
import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('Testing API endpoint...');
    
    // Test without authentication first
    const response = await fetch('http://localhost:4000/api/admin/users/by-role?role=patient');
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const data = await response.text();
    console.log('Response body:', data);
    
  } catch (error) {
    console.error('Error calling API:', error);
  }
}

testAPI();