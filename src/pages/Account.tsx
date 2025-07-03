
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Calendar, User } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  messages: any;
  created_at: string;
  updated_at: string;
  status: string;
}

export const Account: React.FC = () => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatClick = (chatId: string) => {
    navigate(`/chat?id=${chatId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'archived': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t.account}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium">Email:</p>
                <p className="text-gray-600">{user.email}</p>
              </div>
              {profile && (
                <>
                  <div>
                    <p className="font-medium">{t.firstName}:</p>
                    <p className="text-gray-600">{profile.first_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="font-medium">{t.lastName}:</p>
                    <p className="text-gray-600">{profile.last_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Subscription:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 capitalize">{profile.role}</span>
                      {profile.is_premium && (
                        <span className="px-2 py-1 bg-[#FF6600] text-white text-xs rounded-full">
                          Premium
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Chats this month:</p>
                    <p className="text-gray-600">{profile.chat_count_current_month}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t.history}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6600]"></div>
              </div>
            ) : chatHistory.length > 0 ? (
              <div className="space-y-3">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleChatClick(chat.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
                          {chat.title}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(chat.updated_at)}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(chat.status)}`}>
                            {chat.status}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-[#FF6600] hover:text-[#FF6600]/80"
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No chat history yet</p>
                <p className="text-sm">Start your first conversation to see it here</p>
                <Button 
                  className="mt-4 bg-[#FF6600] hover:bg-[#FF6600]/90"
                  onClick={() => navigate('/chat')}
                >
                  Start Chatting
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
