import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { readSupabaseConfig } from "../src/lib/supabase/config.js";

test("company admin provisioning verifies identity and can be safely rerun", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create schema private;
      create table auth.users(id uuid primary key, email text);
      create table private.platform_admins(user_id uuid primary key references auth.users(id), active boolean);`);
    const sql = await readFile(new URL("../supabase/provision-company-admin.sql", import.meta.url), "utf8");
    await db.query("insert into auth.users values ($1, $2)", ["eb122bbb-a5bf-47fd-b25d-248b5e182d18", "wrong@example.test"]);
    await assert.rejects(db.exec(sql), /UID and email do not match/);
    await db.exec("rollback");
    assert.equal((await db.query("select * from private.platform_admins")).rows.length, 0);
    await db.query("update auth.users set email=$1", ["adedokunkhaleed@gmail.com"]);
    await db.exec(sql);
    await db.exec(sql);
    assert.deepEqual((await db.query("select * from private.platform_admins")).rows, [{user_id:"eb122bbb-a5bf-47fd-b25d-248b5e182d18",active:true}]);
  } finally { await db.close(); }
});

test("Supabase configuration accepts browser keys and rejects privileged keys", () => {
  assert.equal(readSupabaseConfig({}).configured, false);
  const config = {
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  };
  assert.equal(readSupabaseConfig(config).configured, true);
  assert.throws(() =>
    readSupabaseConfig({ VITE_SUPABASE_URL: config.VITE_SUPABASE_URL }),
  );
  assert.throws(() =>
    readSupabaseConfig({ ...config, VITE_SUPABASE_URL: "http://example.com" }),
  );
  assert.throws(() =>
    readSupabaseConfig({
      ...config,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test",
    }),
  );
  const jwt = (role) =>
    `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
  assert.equal(
    readSupabaseConfig({
      ...config,
      VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon"),
    }).configured,
    true,
  );
  assert.throws(() =>
    readSupabaseConfig({
      ...config,
      VITE_SUPABASE_PUBLISHABLE_KEY: jwt("service_role"),
    }),
  );
});

test("tenant migration enforces membership, role and profile boundaries", async () => {
  const db = new PGlite();
  const admin = "00000000-0000-0000-0000-000000000001";
  const teacher = "00000000-0000-0000-0000-000000000002";
  const outsider = "00000000-0000-0000-0000-000000000003";
  const school = "00000000-0000-0000-0000-000000000011";
  const otherSchool = "00000000-0000-0000-0000-000000000012";
  const login = async (user, role = "authenticated") => {
    await db.exec(`reset role; set role ${role};`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      user,
    ]);
  };
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema auth, public to anon, authenticated, service_role;
    `);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261007120000_tenant_foundation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261007140000_auth_workspace_access.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const id of [admin, teacher, outsider]) {
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)",
        [
          id,
          `${id}@example.test`,
          JSON.stringify({ display_name: "Test user", role: "superAdmin" }),
        ],
      );
    }
    await db.query(
      "insert into public.schools(id,name,slug) values ($1,'School A','school-a'),($2,'School B','school-b')",
      [school, otherSchool],
    );
    await db.query(
      "insert into public.school_memberships(school_id,user_id,role) values ($1,$2,'school_admin'),($1,$3,'subject_teacher')",
      [school, admin, teacher],
    );
    await login(admin);
    assert.equal(
      (
        await db.query(
          "select public.current_user_is_platform_admin() as allowed",
        )
      ).rows[0].allowed,
      false,
    );
    assert.equal(
      (await db.query("select * from public.schools")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.school_memberships")).rows.length,
      2,
    );
    assert.equal(
      (await db.query("select * from public.profiles")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.schools set name='Renamed' where id=$1 returning id",
          [school],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.schools set name='Forbidden' where id=$1 returning id",
          [otherSchool],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("update public.schools set status='suspended' where id=$1", [
        school,
      ]),
    );
    await assert.rejects(
      db.query(
        "insert into public.school_memberships(school_id,user_id,role) values ($1,$2,'school_admin')",
        [otherSchool, admin],
      ),
    );
    await assert.rejects(db.query("select * from private.platform_admins"));
    await login(teacher);
    assert.equal(
      (await db.query("select * from public.school_memberships")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.schools set name='Forbidden' returning id",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.profiles set display_name='Mine' where id=$1 returning id",
          [teacher],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.profiles set display_name='Forbidden' where id=$1 returning id",
          [admin],
        )
      ).rows.length,
      0,
    );
    await login(outsider);
    assert.equal(
      (await db.query("select * from public.schools")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.school_memberships")).rows.length,
      0,
    );
    await login("", "anon");
    await assert.rejects(
      db.query("select public.current_user_is_platform_admin()"),
    );
    await assert.rejects(db.query("select * from public.schools"));
    await db.exec("reset role");
    await db.query("update public.schools set status='suspended' where id=$1", [
      school,
    ]);
    await login(admin);
    assert.equal(
      (await db.query("select * from public.schools")).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query("insert into private.platform_admins(user_id) values ($1)", [
      outsider,
    ]);
    await login(outsider);
    assert.equal(
      (await db.query("select * from public.schools")).rows.length,
      2,
    );
    assert.equal(
      (
        await db.query(
          "select public.current_user_is_platform_admin() as allowed",
        )
      ).rows[0].allowed,
      true,
    );
  } finally {
    await db.close();
  }
});
