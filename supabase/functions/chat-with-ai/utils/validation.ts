// Enhanced validation with strict JSON schema validation
export function validateInput(data: any): { valid: boolean; error?: string } {
  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body format' };
  }

  const { message, sessionId, language, attachments } = data;
  
  // Validate message (allow empty if attachments are provided)
  if (!message || typeof message !== 'string') {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return { valid: false, error: 'Message is required and must be a string, or attachments must be provided' };
    }
  }
  
  // Strict message validation (allow empty if attachments provided)
  const trimmedMessage = message ? message.trim() : '';
  if (trimmedMessage.length === 0 && (!attachments || attachments.length === 0)) {
    return { valid: false, error: 'Message cannot be empty unless attachments are provided' };
  }
  
  if (trimmedMessage.length > 10000) {
    return { valid: false, error: 'Message is too long (max 10,000 characters)' };
  }
  
  // Check for potential malicious patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmedMessage)) {
      return { valid: false, error: 'Message contains potentially harmful content' };
    }
  }
  
  // Validate sessionId if provided
  if (sessionId !== undefined && sessionId !== null) {
    if (typeof sessionId !== 'string') {
      return { valid: false, error: 'Session ID must be a string' };
    }
    
    // UUID validation for sessionId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (sessionId && !uuidRegex.test(sessionId)) {
      return { valid: false, error: 'Invalid session ID format' };
    }
  }
  
  // Validate language if provided
  if (language !== undefined && language !== null) {
    if (typeof language !== 'string') {
      return { valid: false, error: 'Language must be a string' };
    }
    
    const validLanguages = ['en', 'nl', 'es', 'fr', 'de', 'ar', 'ru', 'pl'];
    if (language && !validLanguages.includes(language.toLowerCase())) {
      return { valid: false, error: 'Invalid language code' };
    }
  }
  
  // Validate attachments if provided
  if (attachments !== undefined && attachments !== null) {
    if (!Array.isArray(attachments)) {
      return { valid: false, error: 'Attachments must be an array' };
    }
    
    if (attachments.length > 5) {
      return { valid: false, error: 'Maximum 5 attachments allowed' };
    }
    
    for (const attachment of attachments) {
      if (!attachment || typeof attachment !== 'object') {
        return { valid: false, error: 'Each attachment must be an object' };
      }
      
      const { id, name, size, type, url } = attachment;
      if (!id || !name || typeof size !== 'number' || !type || !url) {
        return { valid: false, error: 'Attachment missing required fields: id, name, size, type, url' };
      }
      
      if (size > 10 * 1024 * 1024) { // 10MB limit
        return { valid: false, error: `Attachment ${name} exceeds 10MB limit` };
      }
    }
  }

  // Check for unexpected additional fields
  const allowedFields = ['message', 'sessionId', 'language', 'attachments'];
  const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    return { valid: false, error: `Unexpected fields: ${extraFields.join(', ')}` };
  }
  
  return { valid: true };
}

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