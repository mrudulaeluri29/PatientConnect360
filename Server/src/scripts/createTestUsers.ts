// Script to create test users for testing the admin messages functionality
import { prisma } from '../db';
import bcrypt from 'bcrypt';

async function createTestUsers() {
  try {
    console.log('🔨 Creating test users...\n');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create test patients
    const patients = [
      { username: 'patient_02', email: 'patient02@test.com', role: 'PATIENT' },
      { username: 'patient_03', email: 'patient03@test.com', role: 'PATIENT' },
    ];

    // Create test clinicians
    const clinicians = [
      { username: 'clinician_02', email: 'clinician02@test.com', role: 'CLINICIAN' },
      { username: 'clinician_03', email: 'clinician03@test.com', role: 'CLINICIAN' },
    ];

    // Create test caregivers
    const caregivers = [
      { username: 'caregiver_01', email: 'caregiver01@test.com', role: 'CAREGIVER' },
      { username: 'caregiver_02', email: 'caregiver02@test.com', role: 'CAREGIVER' },
    ];

    const allUsers = [...patients, ...clinicians, ...caregivers];

    for (const userData of allUsers) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️  User ${userData.username} already exists, skipping...`);
          continue;
        }

        const user = await prisma.user.create({
          data: {
            username: userData.username,
            email: userData.email,
            passwordHash: hashedPassword,
            role: userData.role as any,
          }
        });

        console.log(`✅ Created ${userData.role}: ${userData.username} (${userData.email})`);
      } catch (error: any) {
        console.error(`❌ Failed to create user ${userData.username}:`, error.message);
      }
    }

    console.log('\n🎉 Test user creation completed!');
    
    // Check final user count
    const finalCount = await prisma.user.count();
    console.log(`Total users now: ${finalCount}`);

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();