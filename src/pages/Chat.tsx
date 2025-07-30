import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, User, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { FileAttachmentMenu } from '@/components/chat/FileAttachmentMenu';
import { MessageAttachments } from '@/components/chat/MessageAttachments';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { N8NChatService, type N8NMessage, type FileAttachment } from '@/services/n8nChatService';
import { ChatSessionService } from '@/services/chatSessionService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const Chat = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<N8NMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(crypto.randomUUID());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewSession = async () => {
    if (!user) return;
    
    try {
      const newSessionId = await ChatSessionService.createSession(
        'New Chat',
        language,
        user.id
      );
      setCurrentSessionId(newSessionId);
      sessionId.current = newSessionId as any;
      setMessages([]);
      setInput('');
      setAttachedFiles([]);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create new chat');
    }
  };

  const loadSession = async (sessionIdToLoad: string) => {
    try {
      const session = await ChatSessionService.getSession(sessionIdToLoad);
      if (session) {
        setCurrentSessionId(sessionIdToLoad);
        sessionId.current = sessionIdToLoad as any;
        setMessages(session.messages);
        setInput('');
        setAttachedFiles([]);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Failed to load chat');
    }
  };

  const saveCurrentSession = async () => {
    if (currentSessionId && messages.length > 0) {
      try {
        await ChatSessionService.updateSessionMessages(currentSessionId, messages);
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;
    
    if (!user) {
      toast.error(t.signInToChat);
      return;
    }

    // Create new session if none exists
    if (!currentSessionId) {
      await createNewSession();
    }

    const userMessage: N8NMessage = {
      content: input,
      role: 'user',
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const response = await N8NChatService.sendMessage(
        input,
        attachedFiles.length > 0 ? attachedFiles : undefined,
        sessionId.current,
        language
      );

      const assistantMessage: N8NMessage = {
        content: response,
        role: 'assistant',
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage, assistantMessage];
      setMessages(updatedMessages);
      
      // Save to database
      if (currentSessionId) {
        await ChatSessionService.updateSessionMessages(currentSessionId, updatedMessages);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full">
      <ChatSidebar
        currentSessionId={currentSessionId}
        onSessionSelect={loadSession}
        onNewChat={createNewSession}
        onClearAllHistory={() => {
          setMessages([]);
          setCurrentSessionId(null);
          sessionId.current = crypto.randomUUID();
        }}
      />
      
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-6 border-b border-border bg-card">
          <h1 className="text-2xl font-bold text-foreground">{t.chatTitle}</h1>
          <p className="text-base text-muted-foreground">
            {t.chatSubtitle}
          </p>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>{t.startConversation}</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2">
                      <MessageAttachments attachments={message.attachments} />
                    </div>
                  )}

                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.thinking}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="p-6 border-t border-border bg-card">
          {attachedFiles.length > 0 && (
            <div className="mb-3">
              <MessageAttachments attachments={attachedFiles} />
            </div>
          )}

          <div className="flex gap-2">
            <FileAttachmentMenu
              onFilesChange={setAttachedFiles}
              attachedFiles={attachedFiles}
              sessionId={sessionId.current}
            />
            
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t.askLegalQuestion}
              disabled={isLoading}
              className="flex-1"
            />
            
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};