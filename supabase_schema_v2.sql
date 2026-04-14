-- 5. Profiles (for credits and billing)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  credits INT DEFAULT 10000,
  tier TEXT DEFAULT 'Tier 1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id)
);

-- 6. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- RLS activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own logs"
ON activity_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- function to initialize profile
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, credits)
  VALUES (new.id, new.raw_user_meta_data->>'name', 10000);
  RETURN new;
END;
$$ language plpgsql security definer;

-- trigger for new user profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
