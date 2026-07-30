-- Permite marcar una garantía como resuelta (igual que "pagado" en
-- servicios), para que la alerta de 48h deje de mencionarla una vez
-- solucionado el problema.
alter table garantias add column if not exists resuelta boolean not null default false;
alter table garantias add column if not exists resuelta_at timestamptz;
