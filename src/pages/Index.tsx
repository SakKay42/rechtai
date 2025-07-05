
import { ArrowRight, Sparkles, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 touch-manipulation">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 animate-in fade-in duration-1000">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium">Добро пожаловать</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
            Ваш новый проект
            <br />
            готов к запуску
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Начните создавать что-то удивительное с этим современным и гибким шаблоном
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
              Начать работу
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
              Узнать больше
            </Button>
          </div>
        </div>
        
        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 animate-in slide-in-from-bottom duration-1000 delay-300">
          <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-200">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Быстрый старт</h3>
              <p className="text-muted-foreground">
                Современные технологии и готовая к использованию структура проекта
              </p>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-200">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Современный дизайн</h3>
              <p className="text-muted-foreground">
                Красивые компоненты и адаптивный интерфейс из коробки
              </p>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Готов к масштабированию</h3>
              <p className="text-muted-foreground">
                Архитектура проекта позволяет легко добавлять новые функции
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* CTA Section */}
        <div className="text-center mt-20 animate-in fade-in duration-1000 delay-500">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Готовы начать создавать?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Этот проект настроен с использованием React, TypeScript, Tailwind CSS и shadcn/ui
            </p>
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-50 shadow-lg">
              Приступить к разработке
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
