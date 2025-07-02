
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Chat: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

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
      <Card>
        <CardHeader>
          <CardTitle>{t.chat}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Чат с AI будет реализован на следующем этапе.
          </p>
          <p className="text-sm text-gray-500">
            Здесь будет интерфейс для общения с AI-помощником по правовым вопросам.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
