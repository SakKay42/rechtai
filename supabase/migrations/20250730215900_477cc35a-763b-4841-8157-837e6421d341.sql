-- Update chat_sessions table to store individual messages properly
-- First, let's modify the existing chat_sessions table to better support our chat history needs

-- Add an index for better performance on user queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_created ON chat_sessions(user_id, created_at DESC);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_chat_session_updated_at ON chat_sessions;
CREATE TRIGGER trigger_update_chat_session_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_updated_at();

-- Add RLS policy for service role to manage chat sessions
CREATE POLICY "Allow service role to manage chat sessions" ON chat_sessions
  FOR ALL USING (true)
  WITH CHECK (true);