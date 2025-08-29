const { messageManager, sessionManager } = require('./backend/src/utils/database');

async function checkForDuplicates() {
  try {
    // Get all sessions
    const sessions = await sessionManager.getAllSessions();
    console.log(`Found ${sessions.length} sessions`);
    
    for (const session of sessions) {
      console.log(`\nChecking session: ${session.id} (${session.session_name || session.title})`);
      
      // Get messages for this session
      const messages = await messageManager.getSessionMessages(session.id);
      console.log(`  Total messages: ${messages.length}`);
      
      // Check for duplicate content
      const contentMap = new Map();
      const duplicates = [];
      
      messages.forEach((msg, index) => {
        const key = `${msg.content}_${msg.role}`;
        if (contentMap.has(key)) {
          duplicates.push({
            original: contentMap.get(key),
            duplicate: { ...msg, index }
          });
        } else {
          contentMap.set(key, { ...msg, index });
        }
      });
      
      if (duplicates.length > 0) {
        console.log(`  ⚠️  Found ${duplicates.length} duplicate messages:`);
        duplicates.forEach(dup => {
          console.log(`    - "${dup.duplicate.content.substring(0, 50)}..." (${dup.duplicate.role})`);
          console.log(`      Original: ${dup.original.id} | Duplicate: ${dup.duplicate.id}`);
        });
      } else {
        console.log(`  ✅ No duplicates found`);
      }
    }
  } catch (error) {
    console.error('Error checking duplicates:', error);
  }
}

checkForDuplicates();