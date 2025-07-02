
-- Создаем enum для языков приложения
CREATE TYPE public.app_language AS ENUM ('nl', 'en', 'ar', 'es', 'ru', 'fr');

-- Создаем enum для ролей пользователей
CREATE TYPE public.user_role AS ENUM ('user', 'premium', 'admin');

-- Создаем enum для статусов чатов
CREATE TYPE public.chat_status AS ENUM ('active', 'completed', 'archived');

-- Создаем enum для типов документов
CREATE TYPE public.document_type AS ENUM ('complaint', 'lawsuit', 'letter', 'form');

-- Создаем enum для статусов документов
CREATE TYPE public.document_status AS ENUM ('pending', 'generating', 'completed', 'failed');

-- Таблица профилей пользователей
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  preferred_language app_language NOT NULL DEFAULT 'nl',
  role user_role NOT NULL DEFAULT 'user',
  chat_count_current_month INTEGER NOT NULL DEFAULT 0,
  subscription_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', NOW()) + interval '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Таблица тарифных планов
CREATE TABLE public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  chat_limit_monthly INTEGER, -- NULL означает неограниченно
  has_pdf_export BOOLEAN NOT NULL DEFAULT false,
  has_document_generation BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Таблица чатов с AI
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  language app_language NOT NULL,
  status chat_status NOT NULL DEFAULT 'active',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_topic TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Таблица PDF экспорта
CREATE TABLE public.pdf_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + interval '30 days')
);

-- Таблица запросов на генерацию документов
CREATE TABLE public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  document_type document_type NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_content TEXT,
  language app_language NOT NULL,
  status document_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Включаем Row Level Security для всех таблиц
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- RLS политики для таблицы profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS политики для subscription_tiers (публичное чтение)
CREATE POLICY "Anyone can view subscription tiers" ON public.subscription_tiers
  FOR SELECT USING (is_active = true);

-- RLS политики для chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" ON public.chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS политики для pdf_exports
CREATE POLICY "Users can view their own PDF exports" ON public.pdf_exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own PDF exports" ON public.pdf_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS политики для document_requests
CREATE POLICY "Users can view their own document requests" ON public.document_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document requests" ON public.document_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document requests" ON public.document_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- Функция для автоматического создания профиля пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE((NEW.raw_user_meta_data ->> 'preferred_language')::app_language, 'nl')
  );
  RETURN NEW;
END;
$$;

-- Триггер для создания профиля при регистрации
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Функция для проверки лимитов чатов
CREATE OR REPLACE FUNCTION public.can_create_chat(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role user_role;
  current_chat_count INTEGER;
BEGIN
  -- Получаем роль пользователя и текущее количество чатов
  SELECT role, chat_count_current_month
  INTO user_role, current_chat_count
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Премиум пользователи имеют неограниченные чаты
  IF user_role = 'premium' OR user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Бесплатные пользователи: 1 чат в месяц
  IF user_role = 'user' AND current_chat_count < 1 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Функция для обновления счетчика чатов
CREATE OR REPLACE FUNCTION public.increment_chat_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Обновляем счетчик чатов пользователя
  UPDATE public.profiles
  SET chat_count_current_month = chat_count_current_month + 1,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Триггер для увеличения счетчика чатов
CREATE TRIGGER on_chat_session_created
  AFTER INSERT ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.increment_chat_count();

-- Функция для сброса месячных лимитов (будет вызываться cron-ом)
CREATE OR REPLACE FUNCTION public.reset_monthly_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET chat_count_current_month = 0,
      subscription_reset_date = date_trunc('month', NOW()) + interval '1 month',
      updated_at = NOW()
  WHERE subscription_reset_date <= NOW();
END;
$$;

-- Заполняем базовые тарифные планы
INSERT INTO public.subscription_tiers (name, price_monthly, chat_limit_monthly, has_pdf_export, has_document_generation)
VALUES 
  ('Free', 0.00, 1, false, false),
  ('Premium', 9.99, NULL, true, true);

-- Создаем индексы для оптимизации запросов
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_subscription_reset ON public.profiles(subscription_reset_date);
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions(created_at);
CREATE INDEX idx_pdf_exports_user_id ON public.pdf_exports(user_id);
CREATE INDEX idx_pdf_exports_expires_at ON public.pdf_exports(expires_at);
CREATE INDEX idx_document_requests_user_id ON public.document_requests(user_id);
CREATE INDEX idx_document_requests_status ON public.document_requests(status);
