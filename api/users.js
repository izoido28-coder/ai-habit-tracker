create table users (
  email text primary key,
  profile jsonb,
  habits jsonb,
  updated_at timestamptz
);
