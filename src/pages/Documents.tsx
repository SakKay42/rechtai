
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle } from 'lucide-react';

export const Documents: React.FC = () => {
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

  // Check if user has premium access (either is_premium flag or premium/admin role)
  const hasPremiumAccess = profile?.is_premium || profile?.role === 'premium' || profile?.role === 'admin';

  if (!hasPremiumAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-[#FF6600] mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Premium Feature</h2>
            <p className="text-gray-600 mb-6">
              Document generation is available for Premium subscribers only.
            </p>
            <Button className="bg-[#FF6600] hover:bg-[#FF6600]/90">
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">
          {t.documents}
        </h1>
        <p className="text-gray-600">
          Generate legal documents based on your chat conversations
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { type: 'complaint', title: 'Complaint Letter', icon: FileText },
          { type: 'lawsuit', title: 'Lawsuit Document', icon: FileText },
          { type: 'letter', title: 'Legal Letter', icon: FileText },
          { type: 'form', title: 'Legal Form', icon: FileText }
        ].map((docType) => (
          <Card key={docType.type} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-[#FF6600]/10 rounded-2xl flex items-center justify-center mb-4">
                <docType.icon className="h-6 w-6 text-[#FF6600]" />
              </div>
              <CardTitle>{docType.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Generate a {docType.title.toLowerCase()} based on your legal consultation.
              </p>
              <Button className="w-full bg-[#FF6600] hover:bg-[#FF6600]/90">
                Create Document
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
