
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './utils/cors.ts'
import { validateInput } from './utils/validation.ts'
import { generateChatResponse } from './utils/n8n.ts'
import { validateUserAccess, sanitizeInput } from './utils/authorization.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting check (basic implementation)
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    // Validate user access and permissions
    const { authorized, profile, error: authzError } = await validateUserAccess(supabase, user.id);
    
    if (!authorized) {
      return new Response(
        JSON.stringify({ error: authzError || 'Access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { message, sessionId, language, attachments } = await req.json()

    // Validate and sanitize inputs
    const validationResult = validateInput({ message, sessionId, language, attachments })
    if (!validationResult.valid) {
      throw new Error(validationResult.error)
    }

    // Additional sanitization
    const sanitizedMessage = sanitizeInput(message || '');
    
    console.log('Processing chat request:', {
      userId: user.id,
      userRole: profile?.role,
      messageLength: sanitizedMessage.length,
      sessionId: sessionId || 'new',
      language,
      clientIP
    });

    // Generate AI response
    const aiResponse = await generateChatResponse(sanitizedMessage, language, attachments)

    // Create or update chat session
    let chatSession
    if (sessionId) {
      // Get existing session and verify ownership
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id) // Ensure user owns the session
        .single()

      if (sessionError || !existingSession) {
        throw new Error('Chat session not found or access denied')
      }

      // Update existing session
      const updatedMessages = [...(existingSession.messages as any[]), 
        { role: 'user', content: sanitizedMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      ]

      const { data, error } = await supabase
        .from('chat_sessions')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id) // Double-check ownership
        .select()
        .single()

      if (error) {
        console.error('Error updating chat session:', error)
        throw new Error('Failed to update chat session')
      }

      chatSession = data
    } else {
      // Create new session
      const messages = [
        { role: 'user', content: sanitizedMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      ]

      // Generate a meaningful title from the first message
      const title = sanitizedMessage.length > 50 
        ? sanitizedMessage.substring(0, 47) + '...' 
        : sanitizedMessage

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: title,
          messages: messages,
          language: language || 'en',
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating chat session:', error)
        throw new Error('Failed to create chat session')
      }

      chatSession = data
    }

    // Log the interaction for audit purposes
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: sessionId ? 'chat_message_sent' : 'chat_session_created',
        table_name: 'chat_sessions',
        record_id: chatSession.id,
        new_values: {
          message_length: sanitizedMessage.length,
          response_length: aiResponse.length,
          client_ip: clientIP
        }
      })

    return new Response(
      JSON.stringify({
        response: aiResponse,
        sessionId: chatSession.id,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Don't expose internal errors to client
    const publicError = error.message.includes('Access denied') || 
                       error.message.includes('Chat limit exceeded') ||
                       error.message.includes('Invalid input') ||
                       error.message.includes('Input too long') ||
                       error.message.includes('Missing authorization')
      ? error.message 
      : 'An internal error occurred'

    return new Response(
      JSON.stringify({ error: publicError }),
      { 
        status: error.message.includes('Access denied') ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
