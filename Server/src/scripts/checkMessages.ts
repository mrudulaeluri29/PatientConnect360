// Script to check message and conversation data in the database
import { prisma } from '../db';

async function checkMessages() {
  try {
    console.log('🔍 Checking messages and conversations in database...\n');
    
    // Get messages with conversations
    const messages = await prisma.message.findMany({
      take: 5,
      include: {
        sender: { select: { username: true, role: true } },
        conversation: { 
          select: { 
            id: true, 
            subject: true,
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

    console.log(`Found ${messages.length} messages:`);
    console.log('');

    messages.forEach((message, index) => {
      console.log(`Message ${index + 1}:`);
      console.log(`  ID: ${message.id}`);
      console.log(`  Sender: ${message.sender.username} (${message.sender.role})`);
      console.log(`  Content: ${message.content.substring(0, 100)}...`);
      console.log(`  Conversation ID: ${message.conversation.id}`);
      console.log(`  Conversation Subject: "${message.conversation.subject}"`);
      console.log(`  Is Read: ${message.isRead}`);
      console.log(`  Created: ${message.createdAt}`);
      console.log(`  Participants:`, message.conversation.participants.map(p => `${p.user.username} (${p.user.role})`));
      console.log('');
    });

  } catch (error) {
    console.error('Error checking messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();