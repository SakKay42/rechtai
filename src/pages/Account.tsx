
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Account: React.FC = () => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();

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
            <CardTitle>{t.account}</CardTitle>
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
                    <p className="text-gray-600 capitalize">{profile.role}</p>
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
            <CardTitle>{t.history}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              История чатов будет добавлена на следующем этапе.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
