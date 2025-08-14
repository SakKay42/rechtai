import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScreenSize } from '@/hooks/useScreenSize';
import { DoorClosed, Menu, X, MessageCircle, CreditCard, FileText } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isTablet, isDesktop } = useScreenSize();
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 touch-manipulation">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 touch-manipulation shadow-sm transition-all duration-200">
        <div className="container mx-auto px-4 py-3 md:py-4">
          {/* Mobile Header */}
          {isMobile && (
            <div className="flex items-center justify-between">
              <h1 
                className="text-xl font-bold text-foreground cursor-pointer" 
                onClick={() => handleNavigation('/')}
              >
                {t.title}
              </h1>
              
              {user ? (
                <div className="flex items-center space-x-1">
                  <ThemeToggle />
                  <LanguageSelector />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Logout"
                  >
                    <DoorClosed className="h-5 w-5 text-muted-foreground" />
                  </Button>
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
                <div className="flex items-center space-x-1">
                  <ThemeToggle />
                  <LanguageSelector />
                  <Button variant="outline" size="sm" onClick={() => handleNavigation('/auth')}>
                    {t.login}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tablet Header */}
          {isTablet && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <h1 
                  className="text-xl font-bold text-foreground cursor-pointer" 
                  onClick={() => navigate('/')}
                >
                  {t.title}
                </h1>
                
                {user && (
                  <nav className="flex items-center space-x-4">
                    <Button
                      variant={isActive('/chat') ? 'default' : 'ghost'}
                      onClick={() => navigate('/chat')}
                      className={`${isActive('/chat') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''} px-3`}
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {t.chat}
                    </Button>
                    <Button
                      variant={isActive('/pricing') ? 'default' : 'ghost'}
                      onClick={() => navigate('/pricing')}
                      className={`${isActive('/pricing') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''} px-3`}
                      size="sm"
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      {t.pricing}
                    </Button>
                    <Button
                      variant={isActive('/docs') ? 'default' : 'ghost'}
                      onClick={() => navigate('/docs')}
                      className={`${isActive('/docs') ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' : ''} px-3`}
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      {t.documents}
                    </Button>
                  </nav>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <LanguageSelector />
                
                {user ? (
                  <div className="flex items-center space-x-2">
                    <span 
                      className="text-sm text-muted-foreground cursor-pointer hover:text-[#FF6600] transition-colors"
                      onClick={() => navigate('/account')}
                    >
                      {getUserDisplayName()}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleSignOut}
                      className="h-9 w-9"
                      aria-label="Logout"
                    >
                      <DoorClosed className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                      {t.login}
                    </Button>
                    <Button 
                      className="bg-[#FF6600] hover:bg-[#FF6600]/90"
                      size="sm"
                      onClick={() => navigate('/auth?mode=signup')}
                    >
                      {t.signup}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop Header */}
          {isDesktop && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <h1 
                  className="text-2xl font-bold text-foreground cursor-pointer" 
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
                      className="text-sm text-muted-foreground cursor-pointer hover:text-[#FF6600] transition-colors"
                      onClick={() => navigate('/account')}
                    >
                      {getUserDisplayName()}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleSignOut}
                      className="h-9 w-9"
                      aria-label="Logout"
                    >
                      <DoorClosed className="h-4 w-4 text-muted-foreground" />
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
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-40 shadow-lg">
              <div className="container mx-auto px-4 pb-4 border-t dark:border-gray-700">
                <div className="flex flex-col space-y-3 pt-4">
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

                  <div className="flex items-center justify-between py-2 border-t dark:border-gray-700 pt-4">
                    <span 
                      className="text-sm text-muted-foreground cursor-pointer hover:text-[#FF6600] transition-colors"
                      onClick={() => handleNavigation('/account')}
                    >
                      {getUserDisplayName()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main className={`pt-[72px] md:pt-[80px] lg:pt-[88px] dark:bg-gray-900 dark:text-white touch-manipulation flex flex-col ${location.pathname === '/chat' ? 'h-screen overflow-hidden' : 'min-h-screen overflow-auto'}`}>
        {children}
      </main>
    </div>
  );
};
