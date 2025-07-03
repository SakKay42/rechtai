
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate environment variables at startup
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

function validateEnvironmentVariables() {
  const missing = [];
  if (!openAIApiKey) missing.push('OPENAI_API_KEY');
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!validateEnvironmentVariables()) {
      console.error('Environment validation failed');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
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

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    
    // Get user from JWT token with better error handling
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
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

    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { message, chatId, language = 'nl' } = requestBody;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.error('Missing or invalid message field');
      return new Response(
        JSON.stringify({ 
          error: 'Message is required and must be non-empty',
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Debug logging for language
    console.log('🌍 Language received from client:', language);
    console.log('🌍 User ID:', user.id);
    console.log(`Processing chat request for user ${user.id} in language ${language}`);

    // Check if user can create new chat (for new chats)
    if (!chatId) {
      try {
        const { data: canCreate, error: limitError } = await supabase.rpc('can_create_chat', {
          user_uuid: user.id
        });

        if (limitError) {
          console.error('Error checking chat limits:', limitError);
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
        console.error('RPC call failed:', rpcError);
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

    // System prompts for different languages
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

    // If continuing existing chat, get message history
    if (currentChatId) {
      try {
        const { data: chatData, error: chatError } = await supabase
          .from('chat_sessions')
          .select('messages, title')
          .eq('id', currentChatId)
          .eq('user_id', user.id)
          .single();

        if (chatError) {
          console.error('Error fetching chat:', chatError);
          return new Response(
            JSON.stringify({ 
              error: 'Error fetching chat',
              success: false 
            }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        messages = Array.isArray(chatData.messages) ? chatData.messages : [];
      } catch (chatFetchError) {
        console.error('Failed to fetch chat:', chatFetchError);
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
          console.error('Error creating chat:', createError);
          return new Response(
            JSON.stringify({ 
              error: 'Error creating chat',
              success: false 
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        currentChatId = newChat.id;
      } catch (chatCreateError) {
        console.error('Failed to create chat:', chatCreateError);
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

    // Prepare messages for OpenAI (convert format and limit history)
    const systemPrompt = systemPrompts[language] || systemPrompts.nl;
    console.log('🌍 Using system prompt for language:', language);
    
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

    console.log(`Sending request to OpenAI with ${openAIMessages.length} messages`);

    // Call OpenAI API with enhanced error handling
    let response;
    try {
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
      console.error('Failed to call OpenAI API:', fetchError);
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
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `AI service error: ${response.status}`,
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
    } catch (jsonError) {
      console.error('Failed to parse OpenAI response:', jsonError);
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

    // Validate OpenAI response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('Invalid OpenAI response structure:', data);
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

    const aiResponse = data.choices[0]?.message?.content;
    if (!aiResponse || typeof aiResponse !== 'string') {
      console.error('Missing or invalid AI response content:', data.choices[0]);
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

    // Add AI response to messages
    const aiMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };
    messages.push(aiMessage);

    // Update chat session with new messages
    try {
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          messages: messages,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentChatId);

      if (updateError) {
        console.error('Error updating chat:', updateError);
        // Don't return error here, as we still want to return the AI response
        // The response was generated successfully, just the storage failed
      }
    } catch (updateChatError) {
      console.error('Failed to update chat:', updateChatError);
      // Continue to return the response even if storage failed
    }

    console.log(`✅ Successfully processed chat request for session ${currentChatId} in language ${language}`);

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
    console.error('Unhandled error in Edge Function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
