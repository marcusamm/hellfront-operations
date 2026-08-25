CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_key TEXT NOT NULL,
  requester_name TEXT,
  discord_id TEXT,
  steam_id TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  staff_reply TEXT,
  handled_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages tickets" ON public.support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX support_tickets_requester_idx ON public.support_tickets (requester_key);
CREATE INDEX support_tickets_status_idx ON public.support_tickets (status, created_at DESC);

CREATE TABLE public.admin_action_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_key TEXT NOT NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  target_player TEXT,
  target_id TEXT,
  server_label TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_action_log TO service_role;
ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages action log" ON public.admin_action_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX admin_action_log_created_idx ON public.admin_action_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();