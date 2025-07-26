import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Globe, History, Plus } from 'lucide-react';
import { FileAttachmentMenu } from '@/components/chat/FileAttachmentMenu';
import { FileAttachment } from '@/components/chat/FileUpload';
import { MessageAttachments } from '@/components/chat/MessageAttachments';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: FileAttachment[];
}

type ChatMode = 'chat' | 'document-generation';
type DocumentType = 'deposit-letter' | 'rental-agreement' | 'complaint-letter';

interface DocumentData {
  userName?: string;
  userAddress?: string;
  landlordName?: string;
  landlordAddress?: string;
  rentalAddress?: string;
  depositAmount?: string;
  moveOutDate?: string;
}

interface DocumentGenerationState {
  mode: ChatMode;
  documentType?: DocumentType;
  currentQuestion: number;
  collectedData: DocumentData;
  questions: string[];
  isConfirming: boolean;
  isGenerating: boolean;
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
  messages: any;
  created_at: string;
  updated_at: string;
}

export const Chat: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [documentGenState, setDocumentGenState] = useState<DocumentGenerationState>({
    mode: 'chat',
    currentQuestion: 0,
    collectedData: {},
    questions: [],
    isConfirming: false,
    isGenerating: false
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  // Load chat history when user is available
  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  // Handle URL parameter for specific chat loading
  useEffect(() => {
    const chatId = searchParams.get('id');
    if (chatId && chatHistory.length > 0) {
      const existingChat = chatHistory.find(chat => chat.id === chatId);
      if (existingChat) {
        setCurrentChat(existingChat);
      } else {
        // Try to load the specific chat from database
        loadSpecificChat(chatId);
      }
    }
  }, [searchParams, chatHistory]);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Convert Supabase data to our ChatSession format with proper type conversion
      const convertedHistory: ChatSession[] = (data || []).map((item: ChatHistoryItem) => ({
        id: item.id,
        title: item.title,
        messages: Array.isArray(item.messages) ? (item.messages as unknown as Message[]) : [],
        created_at: item.created_at
      }));
      
      setChatHistory(convertedHistory);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadSpecificChat = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      if (data) {
        const specificChat: ChatSession = {
          id: data.id,
          title: data.title,
          messages: Array.isArray(data.messages) ? (data.messages as unknown as Message[]) : [],
          created_at: data.created_at
        };
        
        setCurrentChat(specificChat);
        
        // Add to history if not already there
        setChatHistory(prev => {
          const exists = prev.find(chat => chat.id === specificChat.id);
          if (!exists) {
            return [specificChat, ...prev];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error loading specific chat:', error);
      // Clear the URL parameter if chat not found
      setSearchParams({});
    }
  };

  const startNewChat = () => {
    setCurrentChat(null);
    setSearchParams({});
    setIsHistoryOpen(false);
  };

  const selectChat = (chat: ChatSession) => {
    setCurrentChat(chat);
    setSearchParams({ id: chat.id });
    setIsHistoryOpen(false);
  };

  // Document generation functions
  const getDocumentQuestions = (documentType: DocumentType): string[] => {
    switch (documentType) {
      case 'deposit-letter':
        return [
          t.questionUserName,
          t.questionUserAddress,
          t.questionLandlordName,
          t.questionLandlordAddress,
          t.questionRentalAddress,
          t.questionDepositAmount,
          t.questionMoveOutDate
        ];
      default:
        return [];
    }
  };

  const enterDocumentMode = (documentType: DocumentType) => {
    const questions = getDocumentQuestions(documentType);
    setDocumentGenState({
      mode: 'document-generation',
      documentType,
      currentQuestion: 0,
      collectedData: {},
      questions,
      isConfirming: false,
      isGenerating: false
    });

    // Add AI message to start the process
    const startMessage: Message = {
      role: 'assistant',
      content: t.documentModeStart,
      timestamp: new Date().toISOString()
    };

    if (currentChat) {
      setCurrentChat({
        ...currentChat,
        messages: [...currentChat.messages, startMessage]
      });
    }

    // Ask first question
    setTimeout(() => {
      const firstQuestionMessage: Message = {
        role: 'assistant',
        content: questions[0],
        timestamp: new Date().toISOString()
      };

      if (currentChat) {
        setCurrentChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, firstQuestionMessage]
        } : null);
      }
    }, 500);
  };

  const handleDocumentAnswer = (answer: string) => {
    const { currentQuestion, questions, collectedData } = documentGenState;
    
    // Map question index to data field
    const dataKeys = ['userName', 'userAddress', 'landlordName', 'landlordAddress', 'rentalAddress', 'depositAmount', 'moveOutDate'];
    const currentKey = dataKeys[currentQuestion] as keyof DocumentData;
    
    const updatedData = {
      ...collectedData,
      [currentKey]: answer
    };

    if (currentQuestion < questions.length - 1) {
      // Move to next question
      setDocumentGenState(prev => ({
        ...prev,
        currentQuestion: currentQuestion + 1,
        collectedData: updatedData
      }));

      // Ask next question
      setTimeout(() => {
        const nextQuestionMessage: Message = {
          role: 'assistant',
          content: questions[currentQuestion + 1],
          timestamp: new Date().toISOString()
        };

        if (currentChat) {
          setCurrentChat(prev => prev ? {
            ...prev,
            messages: [...prev.messages, nextQuestionMessage]
          } : null);
        }
      }, 500);
    } else {
      // All questions answered, show confirmation
      setDocumentGenState(prev => ({
        ...prev,
        collectedData: updatedData,
        isConfirming: true
      }));

      showDataConfirmation(updatedData);
    }
  };

  const showDataConfirmation = (data: DocumentData) => {
    const confirmationText = `${t.confirmData}

${t.dataUserName}: ${data.userName}
${t.dataUserAddress}: ${data.userAddress}
${t.dataLandlordName}: ${data.landlordName}
${t.dataLandlordAddress}: ${data.landlordAddress}
${t.dataRentalAddress}: ${data.rentalAddress}
${t.dataDepositAmount}: ${data.depositAmount} €
${t.dataMoveOutDate}: ${data.moveOutDate}

${t.allCorrect}`;

    const confirmationMessage: Message = {
      role: 'assistant',
      content: confirmationText,
      timestamp: new Date().toISOString()
    };

    if (currentChat) {
      setCurrentChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, confirmationMessage]
      } : null);
    }
  };

  const generateDocument = async () => {
    setDocumentGenState(prev => ({ ...prev, isGenerating: true }));

    // Show generating message
    const generatingMessage: Message = {
      role: 'assistant',
      content: t.generatingDocument,
      timestamp: new Date().toISOString()
    };

    if (currentChat) {
      setCurrentChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, generatingMessage]
      } : null);
    }

    try {
      // Call PDF generation endpoint
      const { data, error } = await supabase.functions.invoke('generate-document-pdf', {
        body: {
          documentType: documentGenState.documentType,
          documentData: documentGenState.collectedData,
          language: language
        }
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        const successMessage: Message = {
          role: 'assistant',
          content: `${t.documentReady}

[${t.downloadPdf}](${data.pdfUrl})

${t.recommendRegisteredMail}`,
          timestamp: new Date().toISOString()
        };

        if (currentChat) {
          setCurrentChat(prev => prev ? {
            ...prev,
            messages: [...prev.messages, successMessage]
          } : null);
        }
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: t.error,
        description: 'Failed to generate document. Please try again.',
        variant: 'destructive'
      });
    } finally {
      // Reset document generation state
      setDocumentGenState({
        mode: 'chat',
        currentQuestion: 0,
        collectedData: {},
        questions: [],
        isConfirming: false,
        isGenerating: false
      });
    }
  };

  const resetDocumentGeneration = () => {
    setDocumentGenState({
      mode: 'chat',
      currentQuestion: 0,
      collectedData: {},
      questions: [],
      isConfirming: false,
      isGenerating: false
    });

    const resetMessage: Message = {
      role: 'assistant',
      content: 'Хорошо, давайте начнем сначала. Как я могу вам помочь?',
      timestamp: new Date().toISOString()
    };

    if (currentChat) {
      setCurrentChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, resetMessage]
      } : null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && attachedFiles.length === 0) || isLoading) return;

    const userMessage = message.trim();
    const messageAttachments = [...attachedFiles];
    setMessage('');
    setAttachedFiles([]);
    setIsLoading(true);

    // Handle document generation mode
    if (documentGenState.mode === 'document-generation') {
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

      // Handle confirmation responses
      if (documentGenState.isConfirming) {
        if (userMessage.toLowerCase().includes('да') || userMessage.toLowerCase().includes('yes') || userMessage.toLowerCase().includes('ja') || userMessage.toLowerCase().includes('oui')) {
          await generateDocument();
        } else {
          resetDocumentGeneration();
        }
        setIsLoading(false);
        return;
      }

      // Handle document answers
      handleDocumentAnswer(userMessage);
      setIsLoading(false);
      return;
    }

    console.log('🌍 Sending message with language:', language);
    console.log('🔧 Request details:', {
      message: userMessage,
      chatId: currentChat?.id,
      language: language,
      userId: user?.id
    });

    try {
      const newUserMessage: Message = {
        role: 'user',
        content: userMessage || 'Файлы прикреплены',
        timestamp: new Date().toISOString(),
        attachments: messageAttachments
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
          language: language,
          attachments: messageAttachments
        }
      });

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

      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      // Check if AI response contains document generation triggers
      if (data.response.includes('[DOCUMENT:deposit-letter]')) {
        setTimeout(() => {
          enterDocumentMode('deposit-letter');
        }, 1000);
      }

      if (currentChat) {
        const updatedChat = {
          ...currentChat,
          messages: [...currentChat.messages, newUserMessage, aiMessage]
        };
        setCurrentChat(updatedChat);
        
        setChatHistory(prev => prev.map(chat => 
          chat.id === updatedChat.id ? updatedChat : chat
        ));
      } else {
        const newChat: ChatSession = {
          id: data.chatId,
          title: userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage,
          messages: [newUserMessage, aiMessage],
          created_at: new Date().toISOString()
        };
        setCurrentChat(newChat);
        setChatHistory(prev => [newChat, ...prev]);
        
        setSearchParams({ id: newChat.id });
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

      if (currentChat) {
        setCurrentChat({
          ...currentChat,
          messages: currentChat.messages.slice(0, -1)
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="text-center py-8">
            <p className="text-lg dark:text-gray-100">{t.loginToAccount}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-4 h-[calc(100vh-6rem)]">
        {/* Desktop Chat History Sidebar */}
        {!isMobile && (
          <div className="w-1/4 min-w-[250px]">
            <Card className="h-full dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-sm dark:text-gray-100">{t.history}</CardTitle>
                <Button 
                  onClick={startNewChat}
                  size="sm"
                  className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90"
                >
                  {t.startChat}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="p-4 space-y-2">
                    {chatHistory.map((chat) => (
                      <Button
                        key={chat.id}
                        variant={currentChat?.id === chat.id ? "default" : "ghost"}
                        className={`w-full justify-start text-left h-auto p-3 whitespace-normal ${
                          currentChat?.id === chat.id 
                            ? 'bg-[#FF6600] hover:bg-[#FF6600]/90 text-white' 
                            : 'dark:text-gray-100 dark:hover:bg-gray-700'
                        }`}
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
        )}

        {/* Main Chat Area */}
        <div className="flex-1 w-full">
          <Card className="h-full flex flex-col dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="dark:text-gray-100 text-sm md:text-base">
                    {currentChat ? currentChat.title : t.chat}
                  </CardTitle>
                  
                  {/* Mobile History Button */}
                  {isMobile && (
                    <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <History className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[280px]">
                        <SheetHeader>
                          <SheetTitle>{t.history || 'Chat History'}</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4 space-y-2">
                          <Button 
                            onClick={startNewChat}
                            size="sm"
                            className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t.startChat}
                          </Button>
                          <ScrollArea className="h-[calc(100vh-14rem)]">
                            <div className="space-y-2">
                              {chatHistory.map((chat) => (
                                <Button
                                  key={chat.id}
                                  variant={currentChat?.id === chat.id ? "default" : "ghost"}
                                  className={`w-full justify-start text-left h-auto p-3 whitespace-normal ${
                                    currentChat?.id === chat.id 
                                      ? 'bg-[#FF6600] hover:bg-[#FF6600]/90 text-white' 
                                      : 'dark:text-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                  onClick={() => selectChat(chat)}
                                >
                                  <div className="truncate text-sm">
                                    {chat.title}
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs">{language.toUpperCase()}</span>
                </div>
              </div>
              
              {/* Mobile New Chat Button */}
              {isMobile && (
                <Button 
                  onClick={startNewChat}
                  size="sm"
                  className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.startChat}
                </Button>
              )}
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {/* Messages Area */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-[calc(100vh-12rem)] p-4">
                  {currentChat?.messages.length ? (
                    <div className="space-y-4">
                      {currentChat.messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                           <div
                             className={`max-w-[85%] md:max-w-[80%] p-3 rounded-lg ${
                               msg.role === 'user'
                                 ? 'bg-[#FF6600] text-white'
                                 : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                             }`}
                           >
                             <div className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</div>
                             {msg.attachments && msg.attachments.length > 0 && (
                               <MessageAttachments attachments={msg.attachments} />
                             )}
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
                      <div className="text-center px-4">
                        <p className="text-base md:text-lg mb-2">{t.getHelp}</p>
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
              <div className="border-t dark:border-gray-700 p-4 flex-shrink-0">
                {/* Message Form */}
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                    <FileAttachmentMenu 
                      onFilesChange={setAttachedFiles}
                      attachedFiles={attachedFiles}
                      sessionId={currentChat?.id}
                    />
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t.typeYourLegalQuestion || "Type your legal question..."}
                      disabled={isLoading}
                      className="flex-1 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400 text-sm md:text-base"
                    />
                    <Button
                      type="submit"
                      disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}
                      className="bg-[#FF6600] hover:bg-[#FF6600]/90 px-3 md:px-4"
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
