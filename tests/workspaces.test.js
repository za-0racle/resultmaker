import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("school onboarding and teacher RLS enforce owner, school and assignment boundaries", async () => {
  const db = new PGlite();
  const owner = "eb122bbb-a5bf-47fd-b25d-248b5e182d18";
  const admin = "00000000-0000-0000-0000-000000000001";
  const other = "00000000-0000-0000-0000-000000000002";
  const teacher = "00000000-0000-0000-0000-000000000003";
  const unconfirmed = "00000000-0000-0000-0000-000000000004";
  const login = async (id, role = "authenticated") => {
    await db.exec(`reset role; set role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      id,
    ]);
  };
  const scalar = async (sql, params = []) =>
    Object.values((await db.query(sql, params)).rows[0])[0];
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
      grant usage on schema auth, public to anon, authenticated, service_role;`);
    for (const file of [
      "20261007120000_tenant_foundation.sql",
      "20261007140000_auth_workspace_access.sql",
    ])
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${file}`, import.meta.url),
          "utf8",
        ),
      );
    for (const [id, email] of [
      [owner, "adedokunkhaleed@gmail.com"],
      [admin, "admin@example.test"],
      [other, "other@example.test"],
      [teacher, "teacher@example.test"],
      [unconfirmed, "unconfirmed@example.test"],
    ])
      await db.query(
        "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)",
        [
          id,
          email,
          id === unconfirmed ? null : new Date().toISOString(),
          JSON.stringify({ role: "superAdmin" }),
        ],
      );
    await db.exec(
      await readFile(
        new URL("../supabase/activate-role-workspaces.sql", import.meta.url),
        "utf8",
      ),
    );
    await login(unconfirmed);
    await assert.rejects(
      db.query("select public.register_my_school('Pending','pending')"),
      /Confirm your email/,
    );
    await login(admin);
    assert.equal(
      await scalar("select public.current_user_is_platform_admin()"),
      false,
      "metadata cannot grant platform access",
    );
    const school = await scalar(
      "select public.register_my_school('School A','school-a')",
    );
    assert.equal(
      await scalar("select public.register_my_school('Changed','school-b')"),
      school,
      "onboarding is idempotent",
    );
    assert.equal(
      await scalar("select role from public.school_memberships"),
      "school_admin",
    );
    const classA = await scalar(
      "select public.create_school_catalog_item($1,'class','JSS 1')",
      [school],
    );
    const classB = await scalar(
      "select public.create_school_catalog_item($1,'class','JSS 2')",
      [school],
    );
    const maths = await scalar(
      "select public.create_school_catalog_item($1,'subject','Mathematics')",
      [school],
    );
    const english = await scalar(
      "select public.create_school_catalog_item($1,'subject','English')",
      [school],
    );
    await assert.rejects(
      db.query(
        "select public.assign_school_teacher($1,'teacher@example.test','school_admin',$2,null)",
        [school, classA],
      ),
      /Only teacher roles/,
    );
    await assert.rejects(
      db.query(
        "select public.assign_school_teacher($1,'unconfirmed@example.test','class_teacher',$2,null)",
        [school, classA],
      ),
      /confirm their email/,
    );
    const assignment = await scalar(
      "select public.assign_school_teacher($1,'teacher@example.test','subject_teacher',$2,$3)",
      [school, classA, maths],
    );
    assert.equal(
      await scalar(
        "select public.assign_school_teacher($1,'teacher@example.test','subject_teacher',$2,$3)",
        [school, classA, maths],
      ),
      assignment,
    );
    assert.equal(
      (
        await db.query(
          "select email from public.list_school_teacher_accounts($1)",
          [school],
        )
      ).rows[0].email,
      "teacher@example.test",
    );
    await login(other);
    await assert.rejects(
      db.query("select public.register_my_school('Hijack','school-a')"),
      /duplicate key/,
    );
    assert.equal(
      await scalar("select count(*) from public.school_memberships"),
      0,
      "slug collision creates no membership",
    );
    const otherSchool = await scalar(
      "select public.register_my_school('School B','school-b')",
    );
    const otherClass = await scalar(
      "select public.create_school_catalog_item($1,'class','SS 1')",
      [otherSchool],
    );
    await assert.rejects(
      db.query(
        "select public.create_school_catalog_item($1,'subject','Forbidden')",
        [school],
      ),
      /administrator access/,
    );
    await assert.rejects(
      db.query(
        "select public.assign_school_teacher($1,'teacher@example.test','class_teacher',$2,null)",
        [school, classA],
      ),
      /administrator access/,
    );
    await assert.rejects(
      db.query("select public.platform_set_school_status($1,'suspended')", [
        school,
      ]),
      /Platform administrator/,
    );
    await assert.rejects(
      db.query("select public.platform_remove_school($1)", [school]),
      /Platform administrator/,
    );
    await login(admin);
    await assert.rejects(
      db.query(
        "select public.assign_school_teacher($1,'teacher@example.test','subject_teacher',$2,$3)",
        [school, otherClass, maths],
      ),
      /foreign key/,
    );
    assert.equal(
      await scalar("select count(*) from public.teacher_assignments"),
      1,
      "invalid assignment rolls back membership writes",
    );
    await assert.rejects(
      db.query(
        "select public.assign_school_teacher($1,'teacher@example.test','class_teacher',$2,$3)",
        [school, classB, english],
      ),
      /check constraint/,
    );
    await login(teacher);
    await assert.rejects(
      db.query("select * from public.list_school_teacher_accounts($1)", [
        school,
      ]),
      /administrator access/,
    );
    assert.deepEqual(
      (await db.query("select id from public.school_classes")).rows,
      [{ id: classA }],
    );
    assert.deepEqual(
      (await db.query("select id from public.school_subjects")).rows,
      [{ id: maths }],
    );
    assert.equal(await scalar("select count(*) from public.schools"), 1);
    await assert.rejects(
      db.query(
        "insert into public.teacher_assignments(school_id,user_id,role,class_id,subject_id) values($1,$2,'subject_teacher',$3,$4)",
        [school, teacher, classB, english],
      ),
    );
    await assert.rejects(
      db.query("select public.remove_teacher_assignment($1)", [assignment]),
      /administrator access/,
    );
    await login(admin);
    const classAssignment = await scalar(
      "select public.assign_school_teacher($1,'teacher@example.test','class_teacher',$2,null)",
      [school, classB],
    );
    await login(teacher);
    assert.equal(await scalar("select count(*) from public.school_classes"), 2);
    assert.equal(
      await scalar("select count(*) from public.school_subjects"),
      1,
      "class assignment grants no unrelated subjects",
    );
    await db.exec("reset role");
    await db.query(
      "update public.school_memberships set status='suspended' where user_id=$1 and role='subject_teacher'",
      [teacher],
    );
    await login(teacher);
    assert.deepEqual(
      (await db.query("select id from public.school_classes")).rows,
      [{ id: classB }],
    );
    assert.equal(
      await scalar("select count(*) from public.school_subjects"),
      0,
    );
    await login(owner);
    assert.equal(
      await scalar("select public.current_user_is_platform_admin()"),
      true,
    );
    assert.equal(await scalar("select count(*) from public.schools"), 2);
    await db.query("select public.platform_set_school_status($1,'suspended')", [
      school,
    ]);
    await login(teacher);
    assert.equal(
      await scalar("select count(*) from public.teacher_assignments"),
      0,
    );
    assert.equal(await scalar("select count(*) from public.school_classes"), 0);
    await login(admin);
    await assert.rejects(
      db.query(
        "select public.create_school_catalog_item($1,'class','Suspended')",
        [school],
      ),
      /administrator access/,
    );
    await login(owner);
    await db.query("select public.platform_set_school_status($1,'active')", [
      school,
    ]);
    await login(admin);
    await db.query("select public.remove_teacher_assignment($1)", [
      classAssignment,
    ]);
    await login(teacher);
    assert.equal(await scalar("select count(*) from public.school_classes"), 0);
    assert.equal(
      await scalar(
        "select count(*) from public.school_memberships where role='class_teacher'",
      ),
      0,
    );
    await login("", "anon");
    await assert.rejects(
      db.query("select public.register_my_school('Anon','anonymous')"),
    );
    await assert.rejects(db.query("select * from public.school_classes"));
    await login(owner);
    const third = await scalar(
      "select public.platform_create_school('School C','school-c','other@example.test')",
    );
    await db.query("select public.platform_remove_school($1)", [school]);
    assert.equal(
      await scalar(
        "select count(*) from public.teacher_assignments where school_id=$1",
        [school],
      ),
      0,
    );
    await login(admin);
    await assert.rejects(
      db.query("select public.register_my_school('Recreate','recreate')"),
      /registration was removed/,
    );
    await login(other);
    assert.equal(
      await scalar("select count(*) from public.schools where id=$1", [third]),
      1,
    );
  } finally {
    await db.close();
  }
});
