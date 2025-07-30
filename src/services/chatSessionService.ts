import { supabase } from '@/integrations/supabase/client';
import { N8NMessage } from './n8nChatService';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: N8NMessage[];
  language: string;
  status: 'active' | 'completed' | 'archived';
  user_id: string;
}

export class ChatSessionService {
  static async createSession(title: string, language: string, userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        title,
        language,
        messages: [] as any,
        status: 'active',
        user_id: userId
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async getUserSessions(): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(session => ({
      ...session,
      messages: Array.isArray(session.messages) ? session.messages as unknown as N8NMessage[] : []
    }));
  }

  static async getSession(sessionId: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      messages: Array.isArray(data.messages) ? data.messages as unknown as N8NMessage[] : []
    };
  }

  static async updateSessionMessages(sessionId: string, messages: N8NMessage[]): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ 
        messages: JSON.parse(JSON.stringify(messages)),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  static async clearAllSessions(): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .neq('id', 'dummy-id'); // Delete all records

    if (error) throw error;
  }

  static async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId);

    if (error) throw error;
  }
}