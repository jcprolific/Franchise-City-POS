-- Fix live HQ email login (run in Supabase SQL Editor on project wuthacuizslfsadkwmad).
-- Sets password 123456, confirms email, and grants hq_admin on profiles.
-- Idempotent — safe to re-run.

create extension if not exists pgcrypto;

do $$
declare
  v_email text;
  v_user_id uuid;
  v_brand_id uuid := 'a1000000-0000-4000-8000-000000000002';
begin
  foreach v_email in array array['hq@coftea.com', 'admin@coftea.com']
  loop
    select id into v_user_id
    from auth.users
    where lower(email) = lower(v_email)
    limit 1;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) values (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_email,
        crypt('123456', gen_salt('bf')),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', 'Coftea HQ'),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );

      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email),
        'email',
        v_user_id::text,
        now(),
        now(),
        now()
      );
    else
      update auth.users
      set
        encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now(),
        confirmation_token = '',
        recovery_token = '',
        email_change = '',
        email_change_token_new = ''
      where id = v_user_id;
    end if;

    insert into public.profiles (id, role, full_name, brand_id)
    values (v_user_id, 'hq_admin', 'Coftea HQ', v_brand_id)
    on conflict (id) do update
    set
      role = 'hq_admin',
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      brand_id = coalesce(public.profiles.brand_id, excluded.brand_id);
  end loop;
end $$;
