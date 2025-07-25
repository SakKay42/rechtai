
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
    <div className="container mx-auto px-4 py-16 touch-manipulation">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-foreground mb-6">
          {t.title}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
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
            <CardTitle className="text-xl font-bold text-foreground">{t.multilingual}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              Nederlands, English, العربية, Español, Русский, Français, Polski, Deutsch
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="w-12 h-12 bg-[#FF6600]/10 rounded-2xl flex items-center justify-center mb-4">
              <MessageCircle className="h-6 w-6 text-[#FF6600]" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">AI {t.chat}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              {t.getHelp}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="w-12 h-12 bg-[#FF6600]/10 rounded-2xl flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-[#FF6600]" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">PDF {t.documents}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-muted-foreground">
              {t.pdfExport}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-lg text-foreground leading-relaxed whitespace-pre-line">
            {t.rentalLawNotice}
          </div>
        </div>
      </div>
    </div>
  );
};
