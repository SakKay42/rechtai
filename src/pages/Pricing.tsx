
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

export const Pricing: React.FC = () => {
  const { t } = useLanguage();

  const plans = [
    {
      name: t.free,
      price: '€0',
      period: '/month',
      features: [
        `1 ${t.chatsPerMonth}`,
        'Basic support',
        'Multi-language interface'
      ],
      cta: 'Current Plan',
      disabled: true
    },
    {
      name: t.premium,
      price: '€9.99',
      period: '/month',
      features: [
        `${t.unlimited} ${t.chatsPerMonth}`,
        t.pdfExport,
        t.documentGeneration,
        'Priority support',
        'Advanced AI features'
      ],
      cta: 'Upgrade Now',
      disabled: false,
      popular: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-black mb-4">
          {t.pricing}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Choose the plan that works best for you
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan, index) => (
          <Card 
            key={index} 
            className={`relative border-2 ${plan.popular ? 'border-[#FF6600] shadow-lg' : 'border-gray-200'}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#FF6600] text-white px-4 py-1 rounded-full text-sm font-medium">
                  Popular
                </span>
              </div>
            )}
            
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold">
                {plan.name}
              </CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-black">
                  {plan.price}
                </span>
                <span className="text-gray-600">
                  {plan.period}
                </span>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full ${
                  plan.popular 
                    ? 'bg-[#FF6600] hover:bg-[#FF6600]/90' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
                disabled={plan.disabled}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
