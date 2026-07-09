-- Seed Coftea HQ admin account for franchisee management (idempotent)
-- Login: hq@coftea.com / 123456

create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid := 'd1000000-0000-4000-8000-000000000001';
  v_email text := 'hq@coftea.com';
  v_brand_id uuid := 'a1000000-0000-4000-8000-000000000002';
  v_full_name text := 'Coftea HQ';
begin
  if not exists (select 1 from auth.users where lower(email) = lower(v_email)) then
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
      jsonb_build_object('full_name', v_full_name),
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
  end if;

  insert into public.profiles (id, role, full_name, brand_id)
  values (v_user_id, 'hq_admin', v_full_name, v_brand_id)
  on conflict (id) do update
  set
    role = 'hq_admin',
    full_name = excluded.full_name,
    brand_id = excluded.brand_id;
end $$;
