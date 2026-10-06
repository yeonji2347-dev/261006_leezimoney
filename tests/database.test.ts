import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL schema, real RLS, duplicate protection, admin authorization and storage policies", async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase-provided schemas/functions. All public policies and triggers are the actual migration.
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 grant usage on schema public,auth,storage to authenticated,anon;
 grant execute on function auth.uid(),storage.foldername(text) to authenticated;
 grant select,insert,delete on storage.objects to authenticated;`);
    await db.exec(
      await readFile("supabase/migrations/001_initial.sql", "utf8"),
    );
    await db.exec(await readFile("supabase/tests/security.sql", "utf8"));
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::integer as n from public.profiles",
    );
    assert.equal(rows[0].n, 0, "fixtures rolled back");
  } finally {
    await db.close();
  }
});
