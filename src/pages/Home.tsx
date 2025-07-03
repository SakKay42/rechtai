
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, FileText, Download, Globe } from 'lucide-react';

export const Home: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartChat = () => {
    if (user) {
      navigate('/chat');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-black dark:text-white mb-6">
          {t.title}
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
          {t.description}
        </p>
        
        <Button 
          size="lg" 
          className="bg-[#FF6600] hover:bg-[#FF6600]/90 text-white px-8 py-4 text-lg"
          onClick={handleStartChat}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          {t.startChat}
        </Button>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <Card className="border-2 hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="w-12 h-12 bg-[#FF6600]/10 rounded-2xl flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-[#FF6600]" />
            </div>
            <CardTitle className="text-xl font-bold dark:text-white">6 {t.languages}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Nederlands, English, العربية, Español, Русский, Français
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="w-12 h-12 bg-[#FF6600]/10 rounded-2xl flex items-center justify-center mb-4">
              <MessageCircle className="h-6 w-6 text-[#FF6600]" />
            </div>
            <CardTitle className="text-xl font-bold dark:text-white">AI {t.chat}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              {t.getHelp}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="w-12 h-12 bg-[#FF6600]/10 rounded-2xl flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-[#FF6600]" />
            </div>
            <CardTitle className="text-xl font-bold dark:text-white">PDF {t.documents}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              {t.pdfExport}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-12">
        <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
          {t.getHelp}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          {t.description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="bg-[#FF6600] hover:bg-[#FF6600]/90"
            onClick={handleStartChat}
          >
            {t.startChat}
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate('/pricing')}
          >
            {t.pricing}
          </Button>
        </div>
      </div>
    </div>
  );
};
