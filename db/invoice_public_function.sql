-- invoice_public_function.sql
-- Creates a SECURITY DEFINER helper function to fetch invoice by share_token.
-- Only exposes invoice rows when the correct token is provided.

create or replace function public.fetch_invoice_by_token(p_token text)
returns table(id bigint, order_id bigint, total numeric, metadata jsonb, share_token text, created_at timestamptz)
language sql
security definer
stable
as $$
  select id, order_id, total, metadata, share_token, created_at
  from public.invoices
  where share_token = p_token
  limit 1;
$$;

-- Grant execute to anon (optional) so public callers can call the function
grant execute on function public.fetch_invoice_by_token(text) to public;
