
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const getUserDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 
                className="text-2xl font-bold text-black dark:text-white cursor-pointer" 
                onClick={() => navigate('/')}
              >
                {t.title}
              </h1>
              
              {user && (
                <nav className="flex items-center space-x-6">
                  <Button
                    variant={isActive('/chat') ? 'default' : 'ghost'}
                    onClick={() => navigate('/chat')}
                    className={isActive('/chat') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}
                  >
                    {t.chat}
                  </Button>
                  <Button
                    variant={isActive('/pricing') ? 'default' : 'ghost'}
                    onClick={() => navigate('/pricing')}
                    className={isActive('/pricing') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}
                  >
                    {t.pricing}
                  </Button>
                  {user && (
                    <Button
                      variant={isActive('/docs') ? 'default' : 'ghost'}
                      onClick={() => navigate('/docs')}
                      className={isActive('/docs') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}
                    >
                      {t.documents}
                    </Button>
                  )}
                </nav>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LanguageSelector />
              
              {user ? (
                <div className="flex items-center space-x-2">
                  <span 
                    className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:text-[#FF6600] dark:hover:text-[#FF6600] transition-colors"
                    onClick={() => navigate('/account')}
                  >
                    {getUserDisplayName()}
                  </span>
                  <Button variant="outline" onClick={handleSignOut}>
                    {t.logout}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => navigate('/auth')}>
                    {t.login}
                  </Button>
                  <Button 
                    className="bg-[#FF6600] hover:bg-[#FF6600]/90"
                    onClick={() => navigate('/auth?mode=signup')}
                  >
                    {t.signup}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="dark:bg-gray-900 dark:text-white overflow-hidden">{children}</main>
    </div>
  );
};
