
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    
    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const { message, chatId, language = 'nl' } = await req.json();

    // Debug logging for language
    console.log('🌍 Language received from client:', language);
    console.log('🌍 User ID:', user.id);

    if (!message) {
      throw new Error('Message is required');
    }

    console.log(`Processing chat request for user ${user.id} in language ${language}`);

    // Check if user can create new chat (for new chats)
    if (!chatId) {
      const { data: canCreate, error: limitError } = await supabase.rpc('can_create_chat', {
        user_uuid: user.id
      });

      if (limitError) {
        console.error('Error checking chat limits:', limitError);
        throw new Error('Error checking chat limits');
      }

      if (!canCreate) {
        return new Response(
          JSON.stringify({ 
            error: 'Chat limit reached',
            type: 'LIMIT_REACHED'
          }),
          {
            status: 403,
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
      const { data: chatData, error: chatError } = await supabase
        .from('chat_sessions')
        .select('messages, title')
        .eq('id', currentChatId)
        .eq('user_id', user.id)
        .single();

      if (chatError) {
        console.error('Error fetching chat:', chatError);
        throw new Error('Error fetching chat');
      }

      messages = Array.isArray(chatData.messages) ? chatData.messages : [];
    } else {
      // Create new chat session
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
        throw new Error('Error creating chat');
      }

      currentChatId = newChat.id;
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
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    console.log(`Sending request to OpenAI with ${openAIMessages.length} messages`);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add AI response to messages
    const aiMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };
    messages.push(aiMessage);

    // Update chat session with new messages
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({
        messages: messages,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentChatId);

    if (updateError) {
      console.error('Error updating chat:', updateError);
      // Don't throw error here, as we still want to return the AI response
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
    console.error('Error in chat-with-ai function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
