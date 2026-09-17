-- 公式アカウント追加 200件（.com51 〜 .com250）
-- SQL Editor にこの中身を貼って Run
-- パスワード: Kane76123 ／ プロフィール名: 【公式】51〜250

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  i integer;
  uid uuid;
  mail text;
  nick text;
  now_ts timestamptz := now();
BEGIN
  FOR i IN 51..250 LOOP
    mail := 'kane76123@gmail.com' || i::text;
    nick := '【公式】' || i::text;
    uid := NULL;

    SELECT id INTO uid FROM auth.users WHERE email = mail;

    IF uid IS NULL THEN
      uid := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        phone_change,
        email_change_token_current,
        email_change_confirm_status,
        reauthentication_token,
        is_sso_user,
        is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        uid,
        'authenticated',
        'authenticated',
        mail,
        crypt('Kane76123', gen_salt('bf', 10)),
        now_ts,
        now_ts,
        now_ts,
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object(
          'full_name', '【公式】',
          'name', '【公式】',
          'nickname', nick,
          'display_name', '【公式】'
        ),
        false,
        now_ts,
        now_ts,
        '',
        '',
        '',
        '',
        '',
        '',
        0,
        '',
        false,
        false
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = crypt('Kane76123', gen_salt('bf', 10)),
          email_confirmed_at = COALESCE(email_confirmed_at, now_ts),
          raw_user_meta_data = jsonb_build_object(
            'full_name', '【公式】',
            'name', '【公式】',
            'nickname', nick,
            'display_name', '【公式】'
          ),
          updated_at = now_ts
      WHERE id = uid;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = uid AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        uid,
        jsonb_build_object(
          'sub', uid::text,
          'email', mail,
          'email_verified', true,
          'full_name', '【公式】',
          'name', '【公式】'
        ),
        'email',
        uid::text,
        now_ts,
        now_ts,
        now_ts
      );
    END IF;

    INSERT INTO public.users (nickname)
    VALUES (nick)
    ON CONFLICT (nickname) DO NOTHING;

    RAISE NOTICE 'ok: % / %', mail, nick;
  END LOOP;
END $$;
