
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 
                className="text-2xl font-bold text-black cursor-pointer" 
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
                    variant={isActive('/account') ? 'default' : 'ghost'}
                    onClick={() => navigate('/account')}
                    className={isActive('/account') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}
                  >
                    {t.account}
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
              <LanguageSelector />
              
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {user.email}
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
      
      <main>{children}</main>
    </div>
  );
};
