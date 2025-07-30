import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, MessageSquare, Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChatSession, ChatSessionService } from '@/services/chatSessionService';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface ChatSidebarProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onClearAllHistory: () => void;
}

export const ChatSidebar = ({ currentSessionId, onSessionSelect, onNewChat, onClearAllHistory }: ChatSidebarProps) => {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const userSessions = await ChatSessionService.getUserSessions();
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await ChatSessionService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Chat deleted');
      if (currentSessionId === sessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleClearAll = async () => {
    try {
      await ChatSessionService.clearAllSessions();
      setSessions([]);
      toast.success('All chats cleared');
      onClearAllHistory();
    } catch (error) {
      console.error('Error clearing sessions:', error);
      toast.error('Failed to clear chat history');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <Button onClick={onNewChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {t.newChat}
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t.chatHistory}
          </h3>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No chat history
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent ${
                    currentSessionId === session.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t.deleteChat}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.deleteChat}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.confirmDeleteChat}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSession(session.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t.confirm}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {sessions.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.clearAllHistory}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.clearAllHistory}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.confirmClearAllHistory}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  );
};