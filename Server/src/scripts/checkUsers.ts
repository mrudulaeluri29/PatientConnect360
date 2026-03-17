// Script to check what users exist in the database
import { prisma } from '../db';

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total users: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      return;
    }

    // Group by role
    const usersByRole = users.reduce((acc: any, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});

    Object.keys(usersByRole).forEach(role => {
      console.log(`📋 ${role}S (${usersByRole[role].length}):`);
      usersByRole[role].forEach((user: any) => {
        console.log(`  - ${user.username} (${user.email}) - ID: ${user.id}`);
      });
      console.log('');
    });

    // Check messages
    const messageCount = await prisma.message.count();
    console.log(`💬 Total messages in database: ${messageCount}`);

    if (messageCount > 0) {
      const messages = await prisma.message.findMany({
        take: 5,
        include: {
          sender: { select: { username: true, role: true } },
          conversation: { 
            include: { 
              participants: { 
                include: { 
                  user: { select: { username: true, role: true } } 
                } 
              } 
            } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log('\n📩 Recent messages:');
      messages.forEach(msg => {
        const recipient = msg.conversation.participants.find(p => p.userId !== msg.senderId);
        console.log(`  From: ${msg.sender.username} (${msg.sender.role})`);
        console.log(`  To: ${recipient?.user.username || 'Unknown'} (${recipient?.user.role || 'Unknown'})`);
        console.log(`  Content: ${msg.content.substring(0, 50)}...`);
        console.log(`  Date: ${msg.createdAt}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();