-- Drop all existing policies on Webhooks table
DROP POLICY IF EXISTS "allow_read_all" ON public."Webhooks";
DROP POLICY IF EXISTS "Only admins can view webhooks" ON public."Webhooks";
DROP POLICY IF EXISTS "Only admins can insert webhooks" ON public."Webhooks";
DROP POLICY IF EXISTS "Only admins can update webhooks" ON public."Webhooks";
DROP POLICY IF EXISTS "Only admins can delete webhooks" ON public."Webhooks";

-- Create secure policies that only allow admin users to manage webhooks
CREATE POLICY "Admin only - view webhooks" 
ON public."Webhooks" 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin only - insert webhooks" 
ON public."Webhooks" 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin only - update webhooks" 
ON public."Webhooks" 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin only - delete webhooks" 
ON public."Webhooks" 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);