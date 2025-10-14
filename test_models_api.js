// Test script to see what models are returned by Fusion API
const fetch = require('node-fetch');

const FUSION_API_KEY = process.env.FUSION_API_KEY || 'your-key';
const FUSION_BASE_URL = 'https://api.mcp4.ai';

async function checkModels() {
  const response = await fetch(`${FUSION_BASE_URL}/api/models`, {
    headers: {
      'Authorization': `ApiKey ${FUSION_API_KEY}`
    }
  });

  const models = await response.json();
  
  // Find Claude models and check their provider field
  const claudeModels = models.filter(m => 
    m.id_string && m.id_string.includes('claude')
  );

  console.log('\n=== Claude Models ===\n');
  claudeModels.forEach(m => {
    console.log(`Name: ${m.name}`);
    console.log(`Provider: ${m.provider}`);  // ← Should be "anthropic"
    console.log(`ID String: ${m.id_string}`);
    console.log(`Is Active: ${m.is_active}`);
    console.log('---');
  });
}

checkModels().catch(console.error);

