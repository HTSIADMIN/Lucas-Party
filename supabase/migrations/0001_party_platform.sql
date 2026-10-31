-- Lucas Games party platform: accounts, sessions, site settings, the room
-- registry and game history.
--
-- Only the server touches these tables, with the service-role key. RLS is on
-- with no policies, so nothing here is reachable with the public anon key.
-- Times are epoch milliseconds (bigint) to match the app's Date.now() math.

create table public.users (
  id text primary key,
  username text not null,
  username_lower text not null unique,
  display_name text not null,
  password_hash text not null,
  role text not null default 'player' check (role in ('player', 'host', 'admin')),
  character text not null default 'blip',
  disabled boolean not null default false,
  created_at bigint not null,
  last_login_at bigint
);

create table public.sessions (
  token_hash text primary key,
  user_id text not null references public.users (id) on delete cascade,
  created_at bigint not null,
  expires_at bigint not null,
  last_seen_at bigint not null,
  user_agent text
);
create index sessions_user_id_idx on public.sessions (user_id);
create index sessions_expires_at_idx on public.sessions (expires_at);

create table public.settings (
  key text primary key,
  value text not null
);

-- One row per party. The hosting TV runs the game in its browser; this row is
-- the server's record of who owns it, its screen credentials (hashed) and the
-- summary the TV reports on each heartbeat.
create table public.rooms (
  code text primary key,
  screen_secret_hash text not null,
  screen_key text not null,
  owner_user_id text,
  owner_name text,
  status text not null check (status in ('pending', 'active', 'closed')),
  created_at bigint not null,
  last_seen_at bigint not null,
  created_ip text not null,
  phase text not null default 'pending' check (phase in ('pending', 'lobby', 'playing')),
  players integer not null default 0,
  connected integer not null default 0,
  characters jsonb not null default '[]'::jsonb,
  game_id text,
  locked boolean not null default false,
  closed_reason text
);
create index rooms_live_idx on public.rooms (status, last_seen_at desc);

create table public.game_results (
  id text primary key,
  room_code text not null,
  game_id text not null,
  host_user_id text,
  started_at bigint not null,
  ended_at bigint not null,
  players jsonb not null
);
create index game_results_ended_at_idx on public.game_results (ended_at desc);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.settings enable row level security;
alter table public.rooms enable row level security;
alter table public.game_results enable row level security;
