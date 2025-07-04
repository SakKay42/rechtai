
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { DoorClosed, Earth, Menu, X, MessageCircle, CreditCard, FileText } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMobileMenuOpen(false);
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

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const languages = [
    { code: 'nl', name: 'Nederlands' },
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
    { code: 'es', name: 'Español' },
    { code: 'ru', name: 'Русский' },
    { code: 'fr', name: 'Français' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 touch-manipulation">
        <div className="container mx-auto px-4 py-3 md:py-4">
          {/* Mobile Header */}
          {isMobile ? (
            <div className="flex items-center justify-between">
              <h1 
                className="text-xl font-bold text-black dark:text-white cursor-pointer" 
                onClick={() => handleNavigation('/')}
              >
                {t.title}
              </h1>
              
              {user ? (
                <div className="flex items-center space-x-2">
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="h-9 w-9"
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <ThemeToggle />
                  <Button variant="outline" size="sm" onClick={() => handleNavigation('/auth')}>
                    {t.login}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Desktop Header */
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
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {t.chat}
                    </Button>
                    <Button
                      variant={isActive('/pricing') ? 'default' : 'ghost'}
                      onClick={() => navigate('/pricing')}
                      className={isActive('/pricing') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {t.pricing}
                    </Button>
                    <Button
                      variant={isActive('/docs') ? 'default' : 'ghost'}
                      onClick={() => navigate('/docs')}
                      className={isActive('/docs') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {t.documents}
                    </Button>
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
                      <DoorClosed className="h-4 w-4 mr-2" />
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
          )}

          {/* Mobile Menu */}
          {isMobile && mobileMenuOpen && user && (
            <div className="mt-4 pb-4 border-t dark:border-gray-700">
              <div className="flex flex-col space-y-3 pt-4">
                {/* Navigation */}
                <Button
                  variant={isActive('/chat') ? 'default' : 'ghost'}
                  onClick={() => handleNavigation('/chat')}
                  className={`justify-start h-12 ${isActive('/chat') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}`}
                >
                  <MessageCircle className="h-5 w-5 mr-3" />
                  {t.chat}
                </Button>
                
                <Button
                  variant={isActive('/pricing') ? 'default' : 'ghost'}
                  onClick={() => handleNavigation('/pricing')}
                  className={`justify-start h-12 ${isActive('/pricing') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}`}
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  {t.pricing}
                </Button>
                
                <Button
                  variant={isActive('/docs') ? 'default' : 'ghost'}
                  onClick={() => handleNavigation('/docs')}
                  className={`justify-start h-12 ${isActive('/docs') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''}`}
                >
                  <FileText className="h-5 w-5 mr-3" />
                  {t.documents}
                </Button>

                {/* Language Selector Mobile */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <Earth className="h-5 w-5 mr-3" />
                    <span className="text-sm font-medium">Language</span>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* User Info */}
                <div className="flex items-center justify-between py-2 border-t dark:border-gray-700 pt-4">
                  <span 
                    className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:text-[#FF6600] dark:hover:text-[#FF6600] transition-colors"
                    onClick={() => handleNavigation('/account')}
                  >
                    {getUserDisplayName()}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <DoorClosed className="h-4 w-4 mr-2" />
                    {t.logout}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main className="dark:bg-gray-900 dark:text-white overflow-hidden touch-manipulation">
        {children}
      </main>
    </div>
  );
};
