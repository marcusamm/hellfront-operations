CREATE TABLE public.account_links (
  discord_id TEXT PRIMARY KEY,
  discord_username TEXT,
  steam_id TEXT UNIQUE,
  epic_id TEXT UNIQUE,
  epic_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.account_links TO service_role;

ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX account_links_steam_id_idx ON public.account_links (steam_id);
CREATE INDEX account_links_epic_id_idx ON public.account_links (epic_id);

CREATE OR REPLACE FUNCTION public.account_links_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER account_links_updated_at
BEFORE UPDATE ON public.account_links
FOR EACH ROW EXECUTE FUNCTION public.account_links_touch_updated_at();