-- Remove the overly permissive policy that allows public read access
DROP POLICY IF EXISTS "allow_read_all" ON "Webhooks";

-- Create secure policies that only allow admin users to manage webhooks
CREATE POLICY "Only admins can view webhooks" 
ON "Webhooks" 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can insert webhooks" 
ON "Webhooks" 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can update webhooks" 
ON "Webhooks" 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete webhooks" 
ON "Webhooks" 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);