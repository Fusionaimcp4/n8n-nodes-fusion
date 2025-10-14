// Quick check of what /api/models returns
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
  
  // Find Claude/Haiku model
  const haiku = models.find(m => 
    m.id_string && m.id_string.includes('claude-3-5-haiku')
  );

  if (haiku) {
    console.log('\n=== Claude 3.5 Haiku Model Data ===\n');
    console.log(JSON.stringify(haiku, null, 2));
    console.log('\n\nWhat n8n dropdown shows:');
    console.log(`  ${haiku.provider}: ${haiku.name}`);
    console.log(`  value: ${haiku.provider}:${haiku.id_string}`);
    console.log('\n\nWhat gets sent to API:');
    console.log(`  provider: "${haiku.provider}"`);
    console.log(`  model: "${haiku.id_string.split('/')[1]}"`);
    console.log('\n\nWhat SHOULD be sent (from web UI):');
    console.log('  provider: "claude"');
    console.log('  model: "claude-3-5-haiku-20241022"');
  } else {
    console.log('Claude 3.5 Haiku not found in models list');
  }
}

checkModels().catch(console.error);

