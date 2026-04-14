const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  const sql = `
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
  
  DO $$
  BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can manage their own profile'
    ) THEN
        CREATE POLICY "Users can manage their own profile"
        ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
  END
  $$;

  -- RLS activity_logs
  ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

  DO $$
  BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Users can manage their own logs'
    ) THEN
        CREATE POLICY "Users can manage their own logs"
        ON activity_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
  END
  $$;

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
  DO $$
  BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    END IF;
  END
  $$;
  `;

  // Note: Supabase JS library doesn't easily run arbitrary raw SQL without a function.
  // Unless we have a postgres connection string or we expose a function.
  // Actually, wait, maybe I can just write to a file and tell the user to execute it in Supabase dashboard,
  // or I can try using 'postgres' node module if a connection string is available.
  console.log("Migration script needs direct DB execution or run via Supabase SQL Editor.");
}

migrate();
