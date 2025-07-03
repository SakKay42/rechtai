
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Globe } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  messages: any; // Json type from Supabase
  created_at: string;
  updated_at: string;
}

export const Chat: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Convert Supabase data to our ChatSession format
      const convertedHistory: ChatSession[] = (data || []).map((item: ChatHistoryItem) => ({
        id: item.id,
        title: item.title,
        messages: Array.isArray(item.messages) ? item.messages : [],
        created_at: item.created_at
      }));
      
      setChatHistory(convertedHistory);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    // Enhanced debugging - log request details
    console.log('🌍 Sending message with language:', language);
    console.log('🔧 Request details:', {
      message: userMessage,
      chatId: currentChat?.id,
      language: language,
      userId: user?.id
    });

    try {
      // Add user message to current chat immediately for better UX
      const newUserMessage: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };

      if (currentChat) {
        setCurrentChat({
          ...currentChat,
          messages: [...currentChat.messages, newUserMessage]
        });
      }

      console.log('📡 Calling Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: userMessage,
          chatId: currentChat?.id,
          language: language
        }
      });

      // Enhanced error logging
      if (error) {
        console.error('❌ Supabase function error:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Edge Function response:', data);

      if (data?.error) {
        console.error('❌ Application error from Edge Function:', data.error);
        if (data.type === 'LIMIT_REACHED') {
          toast({
            title: t.chatLimitReached || 'Chat limit reached',
            description: t.upgradeForUnlimited || 'Upgrade to Premium for unlimited chats',
            variant: 'destructive'
          });
          return;
        }
        throw new Error(data.error);
      }

      if (!data?.response) {
        console.error('❌ Missing response from Edge Function:', data);
        throw new Error('No response received from AI service');
      }

      // Update current chat with AI response
      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      if (currentChat) {
        // Update existing chat
        setCurrentChat({
          ...currentChat,
          messages: [...currentChat.messages, newUserMessage, aiMessage]
        });
      } else {
        // Create new chat session
        const newChat: ChatSession = {
          id: data.chatId,
          title: userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage,
          messages: [newUserMessage, aiMessage],
          created_at: new Date().toISOString()
        };
        setCurrentChat(newChat);
        setChatHistory(prev => [newChat, ...prev]);
      }

      toast({
        title: t.messageSent || 'Message sent',
        description: t.aiResponseReceived || 'AI response received'
      });

    } catch (error: any) {
      console.error('💥 Complete error details:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });

      // Enhanced error messages for users
      let errorMessage = t.failedToSendMessage || 'Failed to send message';
      let errorTitle = t.error || 'Error';

      if (error.message?.includes('non-2xx status code')) {
        errorMessage = 'Server returned an error. Please try again in a moment.';
        errorTitle = 'Service Temporarily Unavailable';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network connection issue. Please check your internet connection.';
        errorTitle = 'Connection Error';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
        errorTitle = 'Timeout Error';
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive'
      });

      // Revert optimistic UI update
      if (currentChat) {
        setCurrentChat({
          ...currentChat,
          messages: currentChat.messages.slice(0, -1) // Remove the optimistically added message
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentChat(null);
  };

  const selectChat = (chat: ChatSession) => {
    setCurrentChat(chat);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg">{t.loginToAccount}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Chat History Sidebar */}
        <div className="w-1/4 min-w-[250px]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm">{t.history}</CardTitle>
              <Button 
                onClick={startNewChat}
                size="sm"
                className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90"
              >
                {t.startChat}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100%-8rem)]">
                <div className="p-4 space-y-2">
                  {chatHistory.map((chat) => (
                    <Button
                      key={chat.id}
                      variant={currentChat?.id === chat.id ? "default" : "ghost"}
                      className="w-full justify-start text-left h-auto p-3 whitespace-normal"
                      onClick={() => selectChat(chat)}
                    >
                      <div className="truncate text-sm">
                        {chat.title}
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>{currentChat ? currentChat.title : t.chat}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Globe className="h-4 w-4" />
                  <span>{language.toUpperCase()}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {/* Messages Area */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full p-4">
                  {currentChat?.messages.length ? (
                    <div className="space-y-4">
                      {currentChat.messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-[#FF6600] text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                            <div className="text-xs opacity-70 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <p className="text-lg mb-2">{t.getHelp}</p>
                        <p className="text-sm">{t.description}</p>
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs">
                          <Globe className="h-3 w-3" />
                          <span>Language: {language.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Message Input */}
              <div className="border-t p-4 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t.typeYourLegalQuestion || "Type your legal question..."}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!message.trim() || isLoading}
                    className="bg-[#FF6600] hover:bg-[#FF6600]/90"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
