import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

export async function migration(db, file) {
  await db.exec(await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"));
}
export async function foundation() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
    grant usage on schema auth,public to anon,authenticated,service_role;`);
  for(const file of ["20261007120000_tenant_foundation.sql","20261007140000_auth_workspace_access.sql","20261007180000_school_registration_and_teacher_scopes.sql"]) await migration(db,file);
  return db;
}
export async function login(db, id, role="authenticated") {
  await db.exec(`reset role; set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
}
export async function scalar(db, sql, params=[]) {
  return Object.values((await db.query(sql,params)).rows[0])[0];
}
export const expansion = ["20261007200000_academic_structure.sql","20261007210000_assessment_grading_results.sql","20261007220000_report_templates_workflow.sql","20261007230000_subscriptions_billing.sql"];
