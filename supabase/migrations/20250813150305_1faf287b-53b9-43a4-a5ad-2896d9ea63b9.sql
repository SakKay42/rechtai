-- Remove the overly permissive policy that allows public read access
DROP POLICY IF EXISTS "allow_read_all" ON public."Webhooks";

-- Create secure policies that only allow admin users to manage webhooks
CREATE POLICY "Only admins can view webhooks" 
ON public."Webhooks" 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can insert webhooks" 
ON public."Webhooks" 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can update webhooks" 
ON public."Webhooks" 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete webhooks" 
ON public."Webhooks" 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);