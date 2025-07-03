
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
  
  console.log('✅ All environment variables are present');
  return { valid: true, missing: [] };
}

// N8N integration function
async function callN8NWorkflow(data: any) {
  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
  
  if (!n8nWebhookUrl) {
    throw new Error('N8N webhook URL not configured');
  }

  console.log('🔄 Calling N8N workflow...');
  
  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'legal-ai-chat',
        ...data
      }),
    });

    if (!response.ok) {
      console.error('❌ N8N workflow error:', response.status, response.statusText);
      throw new Error(`N8N workflow failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ N8N workflow completed successfully');
    return result;
  } catch (error) {
    console.error('❌ Error calling N8N workflow:', error);
    throw error;
  }
}

// Parse AI response for N8N commands
function parseAIResponseForN8N(aiResponse: string) {
  // Look for N8N command patterns in AI response
  const n8nCommandRegex = /\[N8N_CALL:(.*?)\]/g;
  const matches = [...aiResponse.matchAll(n8nCommandRegex)];
  
  if (matches.length === 0) {
    return { hasN8NCall: false, cleanResponse: aiResponse, n8nCommands: [] };
  }

  let cleanResponse = aiResponse;
  const n8nCommands: any[] = [];

  for (const match of matches) {
    try {
      const commandData = JSON.parse(match[1]);
      n8nCommands.push(commandData);
      // Remove the N8N command from the response
      cleanResponse = cleanResponse.replace(match[0], '');
    } catch (error) {
      console.error('❌ Error parsing N8N command:', error);
    }
  }

  return { 
    hasN8NCall: true, 
    cleanResponse: cleanResponse.trim(), 
    n8nCommands 
  };
}

// Health check endpoint
function handleHealthCheck() {
  const envValidation = validateEnvironmentVariables();
  
  return new Response(
    JSON.stringify({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envValidation.valid ? 'ok' : 'missing_vars',
      missing_vars: envValidation.missing,
      n8n_configured: !!Deno.env.get('N8N_WEBHOOK_URL')
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

    // Enhanced system prompts with N8N integration
    const systemPrompts: Record<string, string> = {
      ru: `Ты AI-ассистент, специализирующийся на голландском праве. Ты предоставляешь пользователям высококачественные юридические сводки ("juridische informatie") в ответ на их вопросы.

Твоя цель - давать четкие, точные и практические юридические выводы на основе голландского права и судебной практики. Ты не просто даешь общие советы — твой ответ должен включать:

1. Краткий правовой анализ ситуации
2. Практический план действий
3. Предупреждение о возможных правовых рисках или последствиях
4. (При необходимости) Упоминание похожих судебных дел или общих исходов
5. (При запросе или актуальности) Черновик или шаблон письма или ответа на правильном языке

**N8N ИНТЕГРАЦИЯ:**
Когда пользователь просит создать документ, письмо, или выполнить сложную задачу, которая требует структурированной обработки, используй команду N8N:
[N8N_CALL:{"action":"generate_document","type":"letter/contract/complaint","data":{"recipient":"","subject":"","content":"","language":"ru"}}]

Ты **не должен направлять пользователя к юристу**, если ситуация не действительно срочная, серьезная или юридически неясная. Твой ответ должен максимально решить проблему пользователя в рамках твоих знаний.

Всегда отвечай на языке, используемом пользователем в интерфейсе, если только другой язык явно не нужен для цели сообщения (например, составление официального письма на голландском языке).

Уточни, что твой ответ - это информативная юридическая сводка, а не формальная юридическая консультация.`,

      nl: `Je bent een AI-assistent gespecialiseerd in het Nederlandse recht. Je verstrekt gebruikers juridische informatie van hoge kwaliteit als reactie op hun vragen.

Jouw doel is om duidelijke, nauwkeurige en bruikbare juridische inzichten te geven gebaseerd op het Nederlandse recht en de jurisprudentie. Je geeft niet alleen algemeen advies — jouw antwoord moet omvatten:

1. Een korte juridische analyse van de situatie
2. Een praktisch actieplan
3. Een waarschuwing over mogelijke juridische risico's of gevolgen
4. (Indien van toepassing) Vermelding van vergelijkbare rechtszaken of gebruikelijke uitkomsten
5. (Indien gevraagd of relevant) Een concept of sjabloon van een brief of reactie in de juiste taal

**N8N INTEGRATIE:**
Wanneer de gebruiker vraagt om een document, brief te maken, of een complexe taak uit te voeren die gestructureerde verwerking vereist, gebruik de N8N-commando:
[N8N_CALL:{"action":"generate_document","type":"letter/contract/complaint","data":{"recipient":"","subject":"","content":"","language":"nl"}}]

Je **mag de gebruiker niet doorverwijzen naar een advocaat** tenzij de situatie echt urgent, ernstig of juridisch onduidelijk is. Jouw antwoord moet het probleem van de gebruiker zoveel mogelijk oplossen binnen jouw kennis.

Antwoord altijd in de taal die de gebruiker gebruikt in de interface, tenzij een andere taal duidelijk nodig is voor het doel van het bericht.

Verduidelijk dat jouw antwoord informatieve juridische informatie is, geen formeel juridisch advies.`,

      en: `You are an AI assistant specialized in Dutch law. You provide users with high-quality legal summaries ("juridische informatie") in response to their questions.

Your goal is to give clear, accurate, and actionable legal insights based on Dutch law and court practice. You do not simply provide general advice — your answer must include:

1. A short legal analysis of the situation
2. A practical plan of action
3. A warning about possible legal risks or consequences
4. (If applicable) Mention of similar court cases or common outcomes
5. (If requested or relevant) A draft or template of a letter or response, in the correct language

**N8N INTEGRATION:**
When the user asks to create a document, letter, or perform a complex task that requires structured processing, use the N8N command:
[N8N_CALL:{"action":"generate_document","type":"letter/contract/complaint","data":{"recipient":"","subject":"","content":"","language":"en"}}]

You **must not refer the user to a lawyer** unless the situation is truly urgent, serious, or legally unclear. Your answer must solve the user's issue as much as possible within your knowledge.

Always reply in the language used by the user in the interface, unless a different language is clearly needed for the purpose of the message.

Clarify that your answer is an informative legal summary, not formal legal advice.`
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

    let aiResponse = data.choices[0]?.message?.content;
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

    // Check for N8N commands in AI response
    const n8nParsing = parseAIResponseForN8N(aiResponse);
    let finalResponse = n8nParsing.cleanResponse;
    let n8nResults: any[] = [];

    // Process N8N commands if found
    if (n8nParsing.hasN8NCall && n8nParsing.n8nCommands.length > 0) {
      console.log('🔧 Processing N8N commands:', n8nParsing.n8nCommands.length);
      
      for (const command of n8nParsing.n8nCommands) {
        try {
          const n8nResult = await callN8NWorkflow({
            ...command,
            userId: user.id,
            chatId: currentChatId,
            userMessage: message
          });
          
          n8nResults.push(n8nResult);
          console.log('✅ N8N command processed successfully');
          
          // Integrate N8N result into the response
          if (n8nResult && n8nResult.result) {
            finalResponse += `\n\n**Результат обработки:**\n${n8nResult.result}`;
          }
        } catch (n8nError) {
          console.error('❌ N8N command failed:', n8nError);
          finalResponse += `\n\n*Примечание: Не удалось выполнить дополнительную обработку запроса.*`;
        }
      }
    }

    // Add AI response to messages
    const aiMessage = {
      role: 'assistant',
      content: finalResponse,
      timestamp: new Date().toISOString(),
      n8n_processed: n8nParsing.hasN8NCall,
      n8n_results: n8nResults
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
        response: finalResponse,
        chatId: currentChatId,
        n8n_processed: n8nParsing.hasN8NCall,
        n8n_results: n8nResults,
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
