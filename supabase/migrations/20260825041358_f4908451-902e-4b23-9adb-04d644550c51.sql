CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  steam_id text,
  epic_id text,
  epic_name text,
  discord_id text,
  discord_username text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.site_roles (
  name text PRIMARY KEY,
  description text,
  grants text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL REFERENCES public.site_roles(name) ON UPDATE CASCADE ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.site_roles TO authenticated;
GRANT ALL ON public.site_roles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.has_site_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND lower(role) = lower(_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_site_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.site_roles sr ON sr.name = ur.role
    WHERE ur.user_id = _user_id AND 'admin' = ANY (sr.grants)
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile readable" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_site_admin(auth.uid()));
CREATE POLICY "own profile updatable" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service role manages profiles" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "signed in read roles" ON public.site_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "service role manages site roles" ON public.site_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "own role rows readable" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all role rows" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_site_admin(auth.uid()));
CREATE POLICY "service role manages user roles" ON public.user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''), split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.site_roles (name, description, grants, sort_order) VALUES
  ('Admin', 'Full control: admin panel, RCON, role management', ARRAY['admin','manageOps','members','rsvp','stats','rcon'], 10),
  ('Server Owner', 'Community owner', ARRAY['admin','manageOps','members','rsvp','stats','rcon'], 11),
  ('Head Mod', 'Lead moderator', ARRAY['admin','manageOps','members','rsvp','stats','rcon'], 20),
  ('Mod', 'Moderator: RCON and operations', ARRAY['manageOps','members','rsvp','stats','rcon'], 21),
  ('Team Manager', 'Runs teams and operations', ARRAY['manageOps','members','rsvp','stats'], 30),
  ('Onboarding Team', 'Handles new recruits', ARRAY['manageOps','members','rsvp','stats'], 31),
  ('Community Rep', 'Community representative', ARRAY['members','rsvp','stats'], 32),
  ('Partner Streamer', 'Partnered content creator', ARRAY['members','rsvp','stats'], 33),
  ('Platinum Member', 'Platinum supporter', ARRAY['members','rsvp','stats'], 40),
  ('Gold Member', 'Gold supporter', ARRAY['members','rsvp','stats'], 41),
  ('Bronze Member', 'Bronze supporter', ARRAY['members','rsvp','stats'], 42),
  ('Donator', 'Donated to the community', ARRAY['members','rsvp','stats'], 43),
  ('Early Supporter', 'Supported us early on', ARRAY['members','rsvp','stats'], 44),
  ('Member', 'Full member', ARRAY['members','rsvp','stats'], 50),
  ('Squad Mate', 'Squad mate', ARRAY['members','rsvp','stats'], 51),
  ('Vietnam Squad Mate', 'Vietnam squad mate', ARRAY['members','rsvp','stats'], 52),
  ('League', 'Competitive league player', ARRAY['members','rsvp','stats'], 53),
  ('Recruit', 'Pending / no access yet', ARRAY[]::text[], 90);