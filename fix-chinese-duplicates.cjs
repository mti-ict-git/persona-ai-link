const fs = require('fs');
const path = require('path');

const filePath = 'src/locales/zh/common.json';

try {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log('Cleaning Chinese translation duplicates...');
  
  // Remove duplicate sections that exist in English cleanup
  if (data.admin) {
    console.log('Removing duplicate admin section');
    delete data.admin;
  }
  
  if (data.login) {
    console.log('Removing duplicate login section');
    delete data.login;
  }
  
  if (data.feedback) {
    console.log('Removing duplicate feedback section');
    delete data.feedback;
  }
  
  // Handle duplicate settings sections
  if (Array.isArray(data.settings)) {
    console.log('Multiple settings sections found, merging...');
    const mergedSettings = {};
    data.settings.forEach(section => {
      Object.assign(mergedSettings, section);
    });
    data.settings = mergedSettings;
  } else if (typeof data.settings === 'object') {
    // Check if there are multiple settings objects at root level
    const settingsKeys = Object.keys(data).filter(key => key === 'settings');
    if (settingsKeys.length > 1) {
      console.log('Multiple settings found, consolidating...');
      // This case is handled by JSON parsing naturally
    }
  }
  
  // Remove duplicate chat.suggestions if it exists
  if (data.chat && data.chat.suggestions && data.suggestions) {
    console.log('Removing duplicate chat.suggestions section');
    delete data.chat.suggestions;
  }
  
  // Remove redundant keys that duplicate common section
  const sectionsToClean = ['auth', 'sidebar', 'training', 'webhook'];
  
  sectionsToClean.forEach(section => {
    if (data[section] && data.common) {
      const keysToRemove = [];
      
      Object.keys(data[section]).forEach(key => {
        if (data.common[key] && data[section][key] === data.common[key]) {
          keysToRemove.push(key);
        }
      });
      
      if (keysToRemove.length > 0) {
        console.log(`Removing ${keysToRemove.length} duplicate keys from ${section}:`, keysToRemove);
        keysToRemove.forEach(key => delete data[section][key]);
      }
    }
  });
  
  // Write the cleaned data back
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log('Chinese translation file cleaned successfully!');
  console.log('Cleaned file saved to:', filePath);
  
} catch (error) {
  console.error('Error cleaning Chinese duplicates:', error.message);
  process.exit(1);
}