
// Enhanced environment validation with detailed logging
export function validateEnvironmentVariables() {
  console.log('🔧 Validating environment variables...');
  
  const requiredVars = {
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
    N8N_WEBHOOK_URL: Deno.env.get('N8N_WEBHOOK_URL')
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return { valid: false, missing };
  }
  
  // Validate N8N webhook URL format
  const n8nUrl = requiredVars.N8N_WEBHOOK_URL;
  if (n8nUrl && !n8nUrl.startsWith('http')) {
    console.error('❌ Invalid N8N_WEBHOOK_URL format:', n8nUrl);
    return { valid: false, missing: ['N8N_WEBHOOK_URL (invalid format)'] };
  }
  
  console.log('✅ All environment variables are present and valid');
  console.log('🔗 N8N_WEBHOOK_URL configured:', n8nUrl ? 'YES' : 'NO');
  
  return { valid: true, missing: [] };
}
