-- Fix the security issue with chat_sessions table
-- The problem is that there are policies allowing public access to ALL operations

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Allow insert from service" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow service role to manage chat sessions" ON public.chat_sessions;

-- Create new policies that are more restrictive
-- Allow authenticated users to insert only their own chat sessions
CREATE POLICY "Service can insert chat sessions" 
ON public.chat_sessions 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Allow service role to manage all chat sessions (only for service_role, not public)
CREATE POLICY "Service role can manage all chat sessions" 
ON public.chat_sessions 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Ensure authenticated users can only insert their own chat sessions (additional safety)
CREATE POLICY "Authenticated users can insert own chat sessions" 
ON public.chat_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);