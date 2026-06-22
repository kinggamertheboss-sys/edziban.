-- Edziban database schema
-- Run this entire file in Supabase: SQL Editor → New query → paste → Run
--
-- SECURITY MODEL
-- ==============
-- All database access goes through server-side Next.js API routes.
-- Those routes use the service role key (SUPABASE_SERVICE_ROLE_KEY),
-- which bypasses RLS automatically — it never touches the browser.
--
-- RLS is enabled on every table below.
-- No policies are defined, which means the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
-- has ZERO access to any table — Supabase denies all anon requests by default
-- when RLS is on and no permissive policy exists.
--
-- This is intentional. Customers and visitors cannot read or write any table
-- directly. The only path to data is through our API routes.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists orders (
  id                   text primary key,
  customer_name        text not null,
  customer_phone       text not null,
  customer_email       text not null,
  event_type           text default '',
  guest_count          integer default 0,
  fulfillment_type     text not null,
  address              text default '',
  distance_range       text default '',
  requested_date       text not null,
  requested_time       text not null,
  special_instructions text default '',
  subtotal             numeric(10,2) not null default 0,
  processing_fee       numeric(10,2) not null default 0,
  delivery_fee         numeric(10,2) not null default 0,
  total                numeric(10,2) not null default 0,
  commission           numeric(10,2) not null default 0,
  status               text not null default 'pending',
  payment_id           text,
  client_type          text not null default 'regular',
  org_name             text default '',
  contact_person       text default '',
  billing_email        text default '',
  po_number            text default '',
  request_invoice      boolean not null default false,
  created_at           timestamptz not null default now()
);

create table if not exists order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   text not null references orders(id) on delete cascade,
  item_id    text not null,
  name       text not null,
  quantity   integer not null,
  unit_price numeric(10,2) not null
);

create table if not exists order_payouts (
  id            uuid primary key default gen_random_uuid(),
  order_id      text not null references orders(id) on delete cascade,
  supplier_id   text not null,
  supplier_name text not null,
  amount        numeric(10,2) not null
);

create table if not exists vendor_payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null,
  supplier_id text not null,
  amount      numeric(10,2) not null,
  method      text not null check (method in ('check', 'zelle')),
  paid_at     text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Enable RLS on every table. With no permissive policies defined,
-- the anon key is fully locked out. Only the service role key can access data.
-- ---------------------------------------------------------------------------

alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table order_payouts   enable row level security;
alter table vendor_payments enable row level security;

-- Explicit deny-all policies (belt-and-suspenders — RLS with no policies already
-- blocks anon access, but these make the intent impossible to misread).
-- If you ever add Supabase Auth for customers in the future, replace these
-- with targeted policies (e.g. "customer can only read their own order").

create policy "deny all anon on orders"
  on orders for all to anon using (false);

create policy "deny all anon on order_items"
  on order_items for all to anon using (false);

create policy "deny all anon on order_payouts"
  on order_payouts for all to anon using (false);

create policy "deny all anon on vendor_payments"
  on vendor_payments for all to anon using (false);

-- ---------------------------------------------------------------------------
-- Discount code system
-- ---------------------------------------------------------------------------

create table if not exists discount_codes (
  code        text primary key,
  amount      numeric(10,2) not null,
  is_active   boolean not null default true,
  single_use  boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists discount_code_uses (
  id             uuid primary key default gen_random_uuid(),
  code           text not null,
  customer_email text not null,
  order_id       text not null,
  created_at     timestamptz not null default now(),
  unique (code, customer_email)
);

alter table orders add column if not exists discount_code   text default null;
alter table orders add column if not exists discount_amount numeric(10,2) not null default 0;

alter table discount_codes      enable row level security;
alter table discount_code_uses  enable row level security;

create policy "deny all anon on discount_codes"
  on discount_codes for all to anon using (false);

create policy "deny all anon on discount_code_uses"
  on discount_code_uses for all to anon using (false);

-- Seed the launch code — $10 off, single use per customer, active
insert into discount_codes (code, amount, is_active, single_use)
values ('FIRST10', 10.00, true, true)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Supplier Hub additions (run these after the initial schema above)
-- ---------------------------------------------------------------------------

alter table orders add column if not exists admin_notes text not null default '';

create table if not exists suppliers (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  phone                    text not null,
  whatsapp                 text not null default '',
  products                 text not null default '',
  wholesale_price_per_unit text not null default '',
  min_batch_size           text not null default '',
  prep_time                text not null default '',
  notes                    text not null default '',
  status                   text not null default 'active' check (status in ('active', 'inactive')),
  created_at               timestamptz not null default now()
);

create table if not exists supplier_contacts (
  id            uuid primary key default gen_random_uuid(),
  order_id      text not null,
  supplier_id   text not null,
  supplier_name text not null,
  method        text not null check (method in ('call', 'whatsapp', 'sms')),
  response      text not null default 'no_response' check (response in ('confirmed', 'declined', 'no_response', 'called_back')),
  notes         text not null default '',
  contacted_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

alter table suppliers         enable row level security;
alter table supplier_contacts enable row level security;

create policy "deny all anon on suppliers"
  on suppliers for all to anon using (false);

create policy "deny all anon on supplier_contacts"
  on supplier_contacts for all to anon using (false);

-- ---------------------------------------------------------------------------
-- Loyalty Rewards (run this migration to enable the loyalty code system)
-- ---------------------------------------------------------------------------

-- Add customer_email to discount_codes so loyalty codes can be tied to one person.
-- Non-loyalty codes (like FIRST10) leave this NULL and remain universally usable.
alter table discount_codes add column if not exists customer_email text default null;

-- Index for fast lookup of loyalty codes by customer
create index if not exists idx_discount_codes_customer_email
  on discount_codes (customer_email)
  where customer_email is not null;

-- ---------------------------------------------------------------------------
-- Notification Logs — persists email/SMS send history per order
-- Run this in Supabase SQL Editor
-- ---------------------------------------------------------------------------

create table if not exists notification_logs (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null,
  type        text not null check (type in ('email', 'sms', 'whatsapp')),
  recipient   text not null,  -- 'customer' | 'admin'
  to_address  text not null,
  subject     text not null default '',
  success     boolean not null default true,
  provider    text not null default '',  -- 'zoho' | 'ses' | 'sns' | 'mock'
  created_at  timestamptz not null default now()
);

create index if not exists idx_notification_logs_order_id on notification_logs (order_id);

alter table notification_logs enable row level security;
create policy "deny all anon on notification_logs"
  on notification_logs for all to anon using (false);
