
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced environment validation with detailed logging
function validateEnvironmentVariables() {
  console.log('🔧 Validating environment variables...');
  
  const requiredVars = {
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY')
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return { valid: false, missing };
  }
  
  console.log('✅ All environment variables are present');
  return { valid: true, missing: [] };
}

// Health check endpoint
function handleHealthCheck() {
  const envValidation = validateEnvironmentVariables();
  
  return new Response(
    JSON.stringify({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envValidation.valid ? 'ok' : 'missing_vars',
      missing_vars: envValidation.missing
    }),
    {
      status: envValidation.valid ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

serve(async (req) => {
  console.log(`🚀 Edge Function called: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.url.includes('/health')) {
    console.log('🏥 Health check requested');
    return handleHealthCheck();
  }

  try {
    // Validate environment variables at the start
    const envValidation = validateEnvironmentVariables();
    if (!envValidation.valid) {
      console.error('❌ Environment validation failed');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing environment variables',
          missing: envValidation.missing,
          success: false 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate request method
    if (req.method !== 'POST') {
      console.error('❌ Invalid method:', req.method);
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed',
          success: false 
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    
    // Enhanced auth handling
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ 
          error: 'Authorization required',
          success: false 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔐 Validating user token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token',
          success: false 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Enhanced request body parsing
    let requestBody;
    try {
      const contentType = req.headers.get('content-type');
      console.log('📝 Content-Type:', contentType);
      
      requestBody = await req.json();
      console.log('📋 Request body parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body - must be valid JSON',
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { message, chatId, language = 'nl' } = requestBody;

    // Enhanced input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.error('❌ Invalid message field:', { message, type: typeof message });
      return new Response(
        JSON.stringify({ 
          error: 'Message is required and must be non-empty string',
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate language parameter
    const supportedLanguages = ['nl', 'en', 'ar', 'es', 'ru', 'fr'];
    if (!supportedLanguages.includes(language)) {
      console.warn('⚠️ Unsupported language, defaulting to nl:', language);
    }

    console.log('🌍 Processing request:', {
      userId: user.id,
      language,
      messageLength: message.length,
      chatId: chatId || 'new chat'
    });

    // Check chat limits for new chats
    if (!chatId) {
      try {
        console.log('📊 Checking chat limits for user...');
        const { data: canCreate, error: limitError } = await supabase.rpc('can_create_chat', {
          user_uuid: user.id
        });

        if (limitError) {
          console.error('❌ Error checking chat limits:', limitError);
          return new Response(
            JSON.stringify({ 
              error: 'Error checking chat limits',
              success: false 
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        if (!canCreate) {
          console.log('⚠️ Chat limit reached for user:', user.id);
          return new Response(
            JSON.stringify({ 
              error: 'Chat limit reached',
              type: 'LIMIT_REACHED',
              success: false
            }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      } catch (rpcError) {
        console.error('❌ RPC call failed:', rpcError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to check chat limits',
            success: false 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Enhanced system prompts
    const systemPrompts: Record<string, string> = {
      nl: "Je bent een AI-assistent gespecialiseerd in Nederlands recht. Je helpt mensen met juridische vragen en geeft begrijpelijke uitleg over Nederlandse wetgeving. Antwoord altijd in het Nederlands, ook als de vraag in een andere taal wordt gesteld. Geef praktische en heldere juridische informatie, maar vermeld altijd dat dit geen vervanging is voor professioneel juridisch advies.",
      en: "You are an AI assistant specialized in Dutch law. You help people with legal questions and provide understandable explanations about Dutch legislation. Always respond in English when the user writes in English. Give practical and clear legal information, but always mention that this is not a replacement for professional legal advice.",
      ar: "أنت مساعد ذكي متخصص في القانون الهولندي. تساعد الناس في الأسئلة القانونية وتقدم شروحات مفهومة حول التشريع الهولندي. أجب دائماً باللغة العربية عندما يكتب المستخدم بالعربية. قدم معلومات قانونية عملية وواضحة، لكن اذكر دائماً أن هذا ليس بديلاً عن الاستشارة القانونية المهنية.",
      es: "Eres un asistente de IA especializado en derecho holandés. Ayudas a las personas con preguntas legales y proporcionas explicaciones comprensibles sobre la legislación holandesa. Siempre responde en español cuando el usuario escriba en español. Proporciona información legal práctica y clara, pero siempre menciona que esto no es un reemplazo para el asesoramiento legal profesional.",
      ru: "Вы AI-помощник, специализирующийся на голландском праве. Вы помогаете людям с правовыми вопросами и даете понятные объяснения голландского законодательства. Всегда отвечайте на русском языке, когда пользователь пишет на русском. Предоставляйте практическую и ясную правовую информацию, но всегда упоминайте, что это не замена профессиональной юридической консультации.",
      fr: "Vous êtes un assistant IA spécialisé en droit néerlandais. Vous aidez les gens avec des questions juridiques et fournissez des explications compréhensibles sur la législation néerlandaise. Répondez toujours en français quand l'utilisateur écrit en français. Donnez des informations juridiques pratiques et claires, mais mentionnez toujours que ceci n'est pas un remplacement pour des conseils juridiques professionnels."
    };

    let currentChatId = chatId;
    let messages: any[] = [];

    // Handle existing chat retrieval
    if (currentChatId) {
      try {
        console.log('📖 Fetching existing chat:', currentChatId);
        const { data: chatData, error: chatError } = await supabase
          .from('chat_sessions')
          .select('messages, title')
          .eq('id', currentChatId)
          .eq('user_id', user.id)
          .single();

        if (chatError) {
          console.error('❌ Error fetching chat:', chatError);
          return new Response(
            JSON.stringify({ 
              error: 'Chat not found or access denied',
              success: false 
            }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        messages = Array.isArray(chatData.messages) ? chatData.messages : [];
        console.log('✅ Loaded', messages.length, 'existing messages');
      } catch (chatFetchError) {
        console.error('❌ Failed to fetch chat:', chatFetchError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch chat',
            success: false 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // Create new chat session
      try {
        console.log('✨ Creating new chat session...');
        const chatTitle = message.length > 50 ? message.substring(0, 50) + '...' : message;
        
        const { data: newChat, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: chatTitle,
            language: language,
            messages: []
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating chat:', createError);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create chat session',
              success: false 
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        currentChatId = newChat.id;
        console.log('✅ Created new chat:', currentChatId);
      } catch (chatCreateError) {
        console.error('❌ Failed to create chat:', chatCreateError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create chat',
            success: false 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Add user message to messages array
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    messages.push(userMessage);

    // Prepare messages for OpenAI with correct system prompt
    const systemPrompt = systemPrompts[language] || systemPrompts.nl;
    console.log('🤖 Using system prompt for language:', language);
    
    const openAIMessages = [
      { 
        role: 'system', 
        content: systemPrompt
      },
      ...messages.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    console.log('📤 Sending request to OpenAI with', openAIMessages.length, 'messages');

    // Enhanced OpenAI API call
    let response;
    try {
      console.log('🔄 Calling OpenAI API...');
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openAIMessages,
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });
    } catch (fetchError) {
      console.error('❌ Failed to call OpenAI API:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to AI service',
          success: false 
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `AI service error: ${response.status}`,
          details: errorText.substring(0, 200),
          success: false 
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let data;
    try {
      data = await response.json();
      console.log('✅ OpenAI response received');
    } catch (jsonError) {
      console.error('❌ Failed to parse OpenAI response:', jsonError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from AI service',
          success: false 
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhanced response validation
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('❌ Invalid OpenAI response structure:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response structure from AI service',
          success: false 
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const aiResponse = data.choices[0]?.message?.content;
    if (!aiResponse || typeof aiResponse !== 'string') {
      console.error('❌ Missing or invalid AI response content:', data.choices[0]);
      return new Response(
        JSON.stringify({ 
          error: 'Empty response from AI service',
          success: false 
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ AI response length:', aiResponse.length);

    // Add AI response to messages
    const aiMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };
    messages.push(aiMessage);

    // Update chat session with new messages
    try {
      console.log('💾 Updating chat session with new messages...');
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          messages: messages,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentChatId);

      if (updateError) {
        console.error('⚠️ Error updating chat (continuing anyway):', updateError);
        // Don't return error here, as we still want to return the AI response
      }
    } catch (updateChatError) {
      console.error('⚠️ Failed to update chat (continuing anyway):', updateChatError);
      // Continue to return the response even if storage failed
    }

    console.log('🎉 Successfully processed chat request for session', currentChatId, 'in language', language);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        chatId: currentChatId,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Unhandled error in Edge Function:', {
      error,
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
