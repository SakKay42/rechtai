
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

// N8N webhook call function
async function callN8NWebhook(data: any, language: string) {
  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
  
  if (!n8nWebhookUrl) {
    console.error('❌ N8N_WEBHOOK_URL not configured');
    return null;
  }

  try {
    console.log('🔄 Calling N8N webhook with data:', data);
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        language: language
      }),
    });

    if (!response.ok) {
      console.error('❌ N8N webhook failed:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    console.log('✅ N8N webhook response received:', result);
    return result;
  } catch (error) {
    console.error('❌ N8N webhook error:', error);
    return null;
  }
}

// Process N8N calls in AI response
async function processN8NCalls(aiResponse: string, language: string): Promise<string> {
  const n8nPattern = /\[N8N_CALL:({[^}]+})\]/g;
  let processedResponse = aiResponse;
  let match;

  while ((match = n8nPattern.exec(aiResponse)) !== null) {
    try {
      const n8nData = JSON.parse(match[1]);
      console.log('🔧 Processing N8N call:', n8nData);
      
      const n8nResult = await callN8NWebhook(n8nData, language);
      
      if (n8nResult && n8nResult.data) {
        // Replace N8N command with actual result
        const resultText = `\n\n**Legal Research Results:**\n${n8nResult.data}\n\n`;
        processedResponse = processedResponse.replace(match[0], resultText);
        console.log('✅ N8N call processed successfully');
      } else {
        // Remove N8N command if no result
        processedResponse = processedResponse.replace(match[0], '');
        console.log('⚠️ N8N call returned no data');
      }
    } catch (error) {
      console.error('❌ Error processing N8N call:', error);
      // Remove failed N8N command
      processedResponse = processedResponse.replace(match[0], '');
    }
  }

  return processedResponse;
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

    // Enhanced system prompts with N8N integration
    const systemPrompts: Record<string, string> = {
      en: `You are an AI assistant specialized in Dutch law. You provide users with high-quality legal summaries ("juridische informatie") in response to their questions.

Your goal is to give clear, accurate, and actionable legal insights based on Dutch law and court practice. You do not simply provide general advice — your answer must include:

1. A short legal analysis of the situation
2. A practical plan of action
3. A warning about possible legal risks or consequences
4. (If applicable) Mention of similar court cases or common outcomes
5. (If requested or relevant) A draft or template of a letter or response, in the correct language (e.g. Dutch for companies or authorities)

You **must not refer the user to a lawyer** unless the situation is truly urgent, serious, or legally unclear. Your answer must solve the user's issue as much as possible within your knowledge.

Always reply in the language used by the user in the interface, unless a different language is clearly needed for the purpose of the message (e.g. composing a formal letter in Dutch).

Clarify that your answer is an informative legal summary, not formal legal advice.

If you believe the user's question requires access to court decisions, legal precedent, or specific law texts, use the following N8N command to trigger an external legal search:

[N8N_CALL:{"action":"legal_search","type":"case_law","data":{"query":"your search query here","language":"en"}}]

Do not ask the user to initiate this search. Decide on your own when it is relevant, and integrate the result naturally into your reply.`,

      nl: `Je bent een AI-assistent gespecialiseerd in Nederlands recht. Je geeft gebruikers hoogwaardige juridische samenvattingen ("juridische informatie") als reactie op hun vragen.

Je doel is om duidelijke, nauwkeurige en bruikbare juridische inzichten te geven gebaseerd op Nederlands recht en rechtspraak. Je geeft niet alleen algemeen advies — je antwoord moet bevatten:

1. Een korte juridische analyse van de situatie
2. Een praktisch actieplan
3. Een waarschuwing voor mogelijke juridische risico's of gevolgen
4. (Indien van toepassing) Vermelding van vergelijkbare rechtszaken of gangbare uitkomsten
5. (Indien gevraagd of relevant) Een concept of sjabloon van een brief of reactie, in de juiste taal (bijv. Nederlands voor bedrijven of autoriteiten)

Je **mag de gebruiker niet doorverwijzen naar een advocaat** tenzij de situatie echt urgent, ernstig of juridisch onduidelijk is. Je antwoord moet het probleem van de gebruiker zoveel mogelijk oplossen binnen je kennis.

Antwoord altijd in de taal die de gebruiker in de interface gebruikt, tenzij een andere taal duidelijk nodig is voor het doel van het bericht (bijv. het opstellen van een formele brief in het Nederlands).

Verduidelijk dat je antwoord een informatieve juridische samenvatting is, geen formeel juridisch advies.

Als je denkt dat de vraag van de gebruiker toegang tot rechterlijke uitspraken, jurisprudentie of specifieke wetteksten vereist, gebruik dan de volgende N8N-opdracht om een externe juridische zoekopdracht te starten:

[N8N_CALL:{"action":"legal_search","type":"case_law","data":{"query":"je zoekopdracht hier","language":"nl"}}]

Vraag de gebruiker niet om deze zoekopdracht te starten. Beslis zelf wanneer het relevant is en integreer het resultaat natuurlijk in je antwoord.`,

      ru: `Вы - AI-помощник, специализирующийся на голландском праве. Вы предоставляете пользователям высококачественные юридические резюме ("juridische informatie") в ответ на их вопросы.

Ваша цель - дать четкие, точные и практические юридические рекомендации на основе голландского права и судебной практики. Вы не просто даете общие советы — ваш ответ должен включать:

1. Краткий юридический анализ ситуации
2. Практический план действий
3. Предупреждение о возможных юридических рисках или последствиях
4. (При необходимости) Упоминание о похожих судебных делах или типичных исходах
5. (При запросе или необходимости) Проект или шаблон письма или ответа на правильном языке (например, на голландском для компаний или властей)

Вы **не должны направлять пользователя к адвокату**, если только ситуация не является действительно срочной, серьезной или юридически неясной. Ваш ответ должен максимально решить проблему пользователя в рамках ваших знаний.

Всегда отвечайте на языке, который пользователь использует в интерфейсе, если только другой язык явно не требуется для цели сообщения (например, составление формального письма на голландском языке).

Уточните, что ваш ответ является информативным юридическим резюме, а не формальной юридической консультацией.

Если вы считаете, что вопрос пользователя требует доступа к судебным решениям, правовым прецедентам или конкретным правовым текстам, используйте следующую команду N8N для запуска внешнего юридического поиска:

[N8N_CALL:{"action":"legal_search","type":"case_law","data":{"query":"ваш поисковый запрос здесь","language":"ru"}}]

Не просите пользователя инициировать этот поиск. Решайте сами, когда это уместно, и естественно интегрируйте результат в свой ответ.`,

      fr: `Vous êtes un assistant IA spécialisé dans le droit néerlandais. Vous fournissez aux utilisateurs des résumés juridiques de haute qualité ("juridische informatie") en réponse à leurs questions.

Votre objectif est de donner des conseils juridiques clairs, précis et pratiques basés sur le droit néerlandais et la jurisprudence. Vous ne donnez pas seulement des conseils généraux — votre réponse doit inclure :

1. Une analyse juridique courte de la situation
2. Un plan d'action pratique
3. Un avertissement sur les risques juridiques possibles ou les conséquences
4. (Le cas échéant) Mention de cas juridiques similaires ou de résultats courants
5. (Si demandé ou pertinent) Un projet ou modèle de lettre ou de réponse, dans la langue correcte (par exemple en néerlandais pour les entreprises ou autorités)

Vous **ne devez pas référer l'utilisateur à un avocat** sauf si la situation est vraiment urgente, sérieuse ou juridiquement incertaine. Votre réponse doit résoudre le problème de l'utilisateur autant que possible dans vos connaissances.

Répondez toujours dans la langue que l'utilisateur utilise dans l'interface, sauf si une langue différente est clairement nécessaire pour le but du message (par exemple composer une lettre formelle en néerlandais).

Clarifiez que votre réponse est un résumé juridique informatif, pas un conseil juridique formel.

Si vous pensez que la question de l'utilisateur nécessite l'accès aux décisions judiciaires, aux précédents juridiques ou aux textes de loi spécifiques, utilisez la commande N8N suivante pour déclencher une recherche juridique externe :

[N8N_CALL:{"action":"legal_search","type":"case_law","data":{"query":"votre requête de recherche ici","language":"fr"}}]

Ne demandez pas à l'utilisateur d'initier cette recherche. Décidez par vous-même quand c'est pertinent et intégrez le résultat naturellement dans votre réponse.`,

      es: `Eres un asistente de IA especializado en derecho holandés. Proporcionas a los usuarios resúmenes legales de alta calidad ("juridische informatie") en respuesta a sus preguntas.

Tu objetivo es dar consejos legales claros, precisos y prácticos basados en el derecho holandés y la jurisprudencia. No solo das consejos generales — tu respuesta debe incluir:

1. Un análisis legal breve de la situación
2. Un plan de acción práctico
3. Una advertencia sobre posibles riesgos legales o consecuencias
4. (Si aplica) Mención de casos legales similares o resultados comunes
5. (Si se solicita o es relevante) Un borrador o plantilla de carta o respuesta, en el idioma correcto (por ejemplo en holandés para empresas o autoridades)

**No debes referir al usuario a un abogado** a menos que la situación sea realmente urgente, seria o legalmente incierta. Tu respuesta debe resolver el problema del usuario tanto como sea posible dentro de tu conocimiento.

Siempre responde en el idioma que el usuario usa en la interfaz, a menos que un idioma diferente sea claramente necesario para el propósito del mensaje (por ejemplo componer una carta formal en holandés).

Aclara que tu respuesta es un resumen legal informativo, no consejo legal formal.

Si crees que la pregunta del usuario requiere acceso a decisiones judiciales, precedentes legales o textos de ley específicos, usa el siguiente comando N8N para activar una búsqueda legal externa:

[N8N_CALL:{"action":"legal_search","type":"case_law","data":{"query":"tu consulta de búsqueda aquí","language":"es"}}]

No le pidas al usuario que inicie esta búsqueda. Decide por ti mismo cuándo es relevante e integra el resultado naturalmente en tu respuesta.`,

      ar: `أنت مساعد ذكي متخصص في القانون الهولندي. تقدم للمستخدمين ملخصات قانونية عالية الجودة ("juridische informatie") كردود على أسئلتهم.

هدفك هو تقديم نصائح قانونية واضحة ودقيقة وعملية مبنية على القانون الهولندي والاجتهاد القضائي. لا تقدم فقط نصائح عامة — يجب أن تتضمن إجابتك:

1. تحليل قانوني مختصر للوضع
2. خطة عمل عملية
3. تحذير من المخاطر القانونية المحتملة أو العواقب
4. (إذا كان ذلك مناسباً) ذكر قضايا قانونية مشابهة أو نتائج شائعة
5. (إذا طُلب أو كان ذلك مناسباً) مسودة أو نموذج رسالة أو رد، باللغة الصحيحة (مثلاً بالهولندية للشركات أو السلطات)

**يجب ألا تحيل المستخدم إلى محامٍ** إلا إذا كانت الحالة عاجلة حقاً أو خطيرة أو غير واضحة قانونياً. يجب أن تحل إجابتك مشكلة المستخدم قدر الإمكان في حدود معرفتك.

اجب دائماً باللغة التي يستخدمها المستخدم في الواجهة، إلا إذا كانت لغة مختلفة مطلوبة بوضوح لغرض الرسالة (مثلاً تأليف رسالة رسمية بالهولندية).

وضح أن إجابتك هي ملخص قانوني إعلامي، وليس استشارة قانونية رسمية.

إذا كنت تعتقد أن سؤال المستخدم يتطلب الوصول إلى قرارات المحكمة أو السوابق القانونية أو النصوص القانونية المحددة، استخدم أمر N8N التالي لتشغيل بحث قانوني خارجي:

[N8N_CALL:{"action":"legal_search","type":"case_law","data":{"query":"استعلام البحث الخاص بك هنا","language":"ar"}}]

لا تطلب من المستخدم بدء هذا البحث. قرر بنفسك متى يكون ذلك مناسباً وادمج النتيجة طبيعياً في إجابتك.`
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

    // Process N8N calls if present in the response
    let processedResponse = aiResponse;
    if (aiResponse.includes('[N8N_CALL:')) {
      console.log('🔧 N8N calls detected, processing...');
      processedResponse = await processN8NCalls(aiResponse, language);
    }

    // Add AI response to messages
    const aiMessage = {
      role: 'assistant',
      content: processedResponse,
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
        response: processedResponse,
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
