-- STOPBUCKS: 0002_vault_purchase_rpc.sql
-- Atomic resolution for "Still Bought It".
--
-- The vault status transition and the matching transaction insert must succeed
-- or fail together. SECURITY INVOKER keeps the caller's RLS context, so every
-- statement is still restricted to the authenticated owner's rows.

CREATE OR REPLACE FUNCTION resolve_vault_purchase(p_vault_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item vault_items%ROWTYPE;
  v_tx transactions%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Lock the row so concurrent resolution attempts serialize.
  SELECT *
    INTO v_item
    FROM vault_items
   WHERE id = p_vault_item_id
     AND user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VAULT_ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_item.status <> 'cooling' THEN
    RAISE EXCEPTION 'VAULT_ITEM_ALREADY_RESOLVED' USING ERRCODE = 'P0001';
  END IF;

  IF v_item.unlock_at > v_now THEN
    RAISE EXCEPTION 'VAULT_ITEM_STILL_COOLING' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO transactions (
    user_id,
    amount_minor,
    note,
    trigger_tag,
    payment_mode,
    logged_at
  )
  VALUES (
    v_user_id,
    v_item.price_minor,
    v_item.item_name,
    v_item.trigger_tag,
    'cashless',
    v_now
  )
  RETURNING * INTO v_tx;

  UPDATE vault_items
     SET status = 'purchased',
         resolved_at = v_now
   WHERE id = v_item.id
     AND user_id = v_user_id
     AND status = 'cooling'
  RETURNING * INTO v_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VAULT_ITEM_ALREADY_RESOLVED' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'item', to_jsonb(v_item),
    'transaction', to_jsonb(v_tx)
  );
END;
$$;

REVOKE ALL ON FUNCTION resolve_vault_purchase(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_vault_purchase(UUID) TO authenticated;
