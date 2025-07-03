
// Enhanced N8N webhook call function with timeout and better logging
export async function callN8NWebhook(data: any, language: string) {
  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
  
  if (!n8nWebhookUrl) {
    console.error('❌ N8N_WEBHOOK_URL not configured');
    return null;
  }

  try {
    console.log('🔄 Calling N8N webhook:', {
      url: n8nWebhookUrl,
      data: data,
      language: language
    });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        language: language
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('📡 N8N webhook response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ N8N webhook failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return null;
    }

    const result = await response.json();
    console.log('✅ N8N webhook response received:', result);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ N8N webhook timeout after 30 seconds');
    } else {
      console.error('❌ N8N webhook error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return null;
  }
}

// Enhanced N8N call processing with improved regex and logging
export async function processN8NCalls(aiResponse: string, language: string): Promise<string> {
  // Improved regex to handle nested JSON properly
  const n8nPattern = /\[N8N_CALL:(\{.*?\})\]/g;
  let processedResponse = aiResponse;
  let match;
  let callCount = 0;

  console.log('🔍 Checking for N8N calls in AI response...');
  console.log('📄 AI response length:', aiResponse.length);
  console.log('📝 AI response preview:', aiResponse.substring(0, 200) + '...');
  
  // Check if there are any N8N calls
  const hasN8NCalls = n8nPattern.test(aiResponse);
  console.log('🎯 N8N calls detected:', hasN8NCalls);
  
  // Reset regex to process matches
  n8nPattern.lastIndex = 0;

  while ((match = n8nPattern.exec(aiResponse)) !== null) {
    callCount++;
    console.log(`🔧 Processing N8N call #${callCount}:`, {
      fullMatch: match[0],
      jsonPart: match[1]
    });
    
    try {
      const n8nData = JSON.parse(match[1]);
      console.log('✅ Successfully parsed N8N JSON:', n8nData);
      
      const n8nResult = await callN8NWebhook(n8nData, language);
      
      if (n8nResult && n8nResult.data) {
        // Replace N8N command with actual result
        const resultText = `\n\n**Результаты правового поиска:**\n${n8nResult.data}\n\n`;
        processedResponse = processedResponse.replace(match[0], resultText);
        console.log('✅ N8N call processed successfully, result integrated');
      } else {
        // Remove N8N command if no result
        processedResponse = processedResponse.replace(match[0], '\n\n*Поиск судебной практики временно недоступен. Информация предоставлена на основе общих знаний.*\n\n');
        console.log('⚠️ N8N call returned no data, showing fallback message');
      }
    } catch (parseError) {
      console.error('❌ Error parsing N8N JSON:', {
        error: parseError.message,
        jsonString: match[1]
      });
      // Remove failed N8N command and show error message
      processedResponse = processedResponse.replace(match[0], '\n\n*Ошибка при обращении к базе судебной практики. Информация предоставлена на основе общих знаний.*\n\n');
    }
  }

  console.log(`📊 N8N processing complete: ${callCount} calls processed`);
  return processedResponse;
}
