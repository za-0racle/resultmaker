// Requires Vite :5173 and isolated Chrome CDP :9222. All Auth/API calls are simulated.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const tabs = await fetch("http://127.0.0.1:9222/json").then((r) => r.json());
const ws = new WebSocket(
  tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl,
);
await new Promise((resolve) =>
  ws.addEventListener("open", resolve, { once: true }),
);
let sequence = 0;
const pending = new Map(),
  errors = [];
ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    message.error ? task.reject(message.error) : task.resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 120; i++) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error(`Timed out: ${expression}`);
}
async function open(path) {
  await send("Page.navigate", { url: `http://127.0.0.1:5173${path}` });
  await wait("!!document.querySelector('h1')");
}
function fixture() {
  const original = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = String(input?.url || input);
    if (!url.includes(".supabase.co/")) return original(input, init);
    const respond = (data) =>
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const body = init.body ? JSON.parse(init.body) : {},
      email = sessionStorage.getItem("fixture-user");
    const user = {
      id: "00000000-0000-0000-0000-000000000001",
      email,
      aud: "authenticated",
      role: "authenticated",
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata:
        email === "newadmin@example.test"
          ? JSON.parse(sessionStorage.getItem("fixture-signup") || "{}").data
          : {},
    };
    if (url.includes("/auth/v1/signup")) {
      sessionStorage.setItem("fixture-signup", JSON.stringify(body));
      return respond({ ...user, email: body.email });
    }
    if (url.includes("/auth/v1/token")) {
      sessionStorage.setItem("fixture-user", body.email);
      user.email = body.email;
      const b64 = (value) =>
        btoa(JSON.stringify(value))
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replaceAll("=", "");
      return respond({
        access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated", role: "authenticated" })}.test`,
        refresh_token: "fixture-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user,
      });
    }
    if (url.includes("/auth/v1/user")) return respond(user);
    if (url.includes("/auth/v1/logout")) {
      sessionStorage.removeItem("fixture-user");
      return respond({});
    }
    if (url.includes("/rpc/current_user_is_platform_admin"))
      return respond(email === "owner@example.test");
    if (url.includes("/rpc/register_my_school")) {
      sessionStorage.setItem("fixture-registered", "true");
      sessionStorage.setItem("fixture-school-request", JSON.stringify(body));
      return respond("school-a");
    }
    if (url.includes("/rest/v1/school_memberships")) {
      const role =
        {
          "admin@example.test": "school_admin",
          "teacher@example.test": "subject_teacher",
          "class@example.test": "class_teacher",
        }[email] ||
        (email === "newadmin@example.test" &&
        sessionStorage.getItem("fixture-registered")
          ? "school_admin"
          : null);
      return respond(
        role
          ? [
              {
                school_id: "school-a",
                role,
                status: "active",
                school: {
                  id: "school-a",
                  name: "Test School",
                  slug: "test-school",
                  status: "active",
                },
              },
            ]
          : [],
      );
    }
    if (url.includes("/rest/v1/schools"))
      return respond([
        {
          id: "school-a",
          name: "Test School",
          slug: "test-school",
          status: "active",
        },
        {
          id: "school-b",
          name: "Other School",
          slug: "other-school",
          status: "suspended",
        },
      ]);
    if (url.includes("/rest/v1/school_classes"))
      return respond([
        { id: "class-a", name: "JSS 1" },
        ...(email === "teacher@example.test"
          ? []
          : [{ id: "class-b", name: "JSS 2" }]),
      ]);
    if (url.includes("/rest/v1/school_subjects"))
      return respond([
        { id: "subject-a", name: "Mathematics" },
        ...(email === "teacher@example.test"
          ? []
          : [{ id: "subject-b", name: "English" }]),
      ]);
    if (url.includes("/rest/v1/teacher_assignments"))
      return respond([
        {
          id: "assignment-a",
          user_id: user.id,
          role:
            email === "class@example.test"
              ? "class_teacher"
              : "subject_teacher",
          class_id: "class-a",
          subject_id: email === "class@example.test" ? null : "subject-a",
        },
      ]);
    if (url.includes("/rpc/list_school_teacher_accounts"))
      return respond([
        {
          user_id: user.id,
          email: "teacher@example.test",
          display_name: "Test teacher",
        },
      ]);
    if (url.includes("/rpc/")) {
      sessionStorage.setItem("fixture-action", JSON.stringify({ url, body }));
      return respond("created-id");
    }
    return respond([]);
  };
}
async function login(email, path) {
  await open("/login");
  await evaluate(
    `document.querySelector('#login-email').value=${JSON.stringify(email)};document.querySelector('#login-password').value='test-password';document.querySelector('#auth-login').requestSubmit()`,
  );
  await wait(
    `location.pathname===${JSON.stringify(path)} && !!document.querySelector('#auth-logout')`,
  );
}
async function logout() {
  await evaluate("document.querySelector('#auth-logout').click()");
  await wait(
    "location.pathname==='/login' && !!document.querySelector('#auth-login')",
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
}
function resultsFixture() {
  const original = window.fetch.bind(window);
  window.fixtureRequests = [];
  const tables = (window.fixtureTables = {
    academic_sessions: [
      { id: "year", school_id: "school-a", name: "2026/27", status: "active" },
    ],
    academic_terms: [
      {
        id: "term",
        school_id: "school-a",
        session_id: "year",
        name: "First term",
        sort_order: 1,
      },
    ],
    assessment_schemes: [
      {
        id: "scheme",
        school_id: "school-a",
        name: "Custom assessments",
        version: 1,
        status: "active",
      },
    ],
    assessment_components: [
      {
        id: "component",
        school_id: "school-a",
        scheme_id: "scheme",
        name: "School test",
        max_score: 20,
        weight: 100,
        sort_order: 1,
        active: true,
      },
    ],
    grading_scales: [
      {
        id: "scale",
        school_id: "school-a",
        name: "School grading",
        version: 1,
        status: "active",
      },
    ],
    grading_scale_items: [
      {
        id: "band",
        school_id: "school-a",
        scale_id: "scale",
        minimum_score: 0,
        maximum_score: 100,
        grade: "A",
        remark: "Excellent",
      },
    ],
    subject_offerings: [
      {
        id: "offer",
        school_id: "school-a",
        session_id: "year",
        class_id: "class-a",
        subject_id: "subject-a",
        assessment_scheme_id: "scheme",
        grading_scale_id: "scale",
      },
    ],
    result_batches: [
      {
        id: "batch",
        school_id: "school-a",
        offering_id: "offer",
        session_id: "year",
        term_id: "term",
        class_id: "class-a",
        assessment_scheme_id: "scheme",
        grading_scale_id: "scale",
        version: 1,
        status: "draft",
      },
    ],
    student_results: [
      {
        id: "report",
        school_id: "school-a",
        enrollment_id: "enrollment",
        session_id: "year",
        term_id: "term",
        class_id: "class-a",
        version: 1,
        status: "draft",
      },
    ],
    academic_results: [
      {
        id: "academic",
        school_id: "school-a",
        student_result_id: "report",
        batch_id: "batch",
        assessment_scheme_id: "scheme",
      },
    ],
    assessment_scores: [
      {
        id: "score",
        school_id: "school-a",
        academic_result_id: "academic",
        component_id: "component",
        assessment_scheme_id: "scheme",
        score: 10,
      },
    ],
    students: [
      {
        id: "student",
        school_id: "school-a",
        first_name: "Ada",
        last_name: "Test",
        admission_number: "001",
        class_id: "class-a",
        status: "active",
      },
    ],
    student_enrollments: [
      {
        id: "enrollment",
        school_id: "school-a",
        student_id: "student",
        session_id: "year",
        class_id: "class-a",
        status: "active",
      },
    ],
    result_templates: [
      {
        id: "template",
        school_id: "school-a",
        name: "Classic",
        version: 1,
        status: "active",
      },
    ],
    school_sections: [],
  });
  window.fetch = async (input, init = {}) => {
    const url = String(input?.url || input);
    if (url.includes(".supabase.co/")) window.fixtureRequests.push(url);
    const parsed = new URL(url, location.origin),
      table = parsed.pathname.split("/").at(-1);
    if (url.includes("/rest/v1/") && tables[table]) {
      const body = init.body ? JSON.parse(init.body) : {};
      if (init.method === "PATCH") {
        Object.assign(
          tables[table].find(
            (r) =>
              !parsed.searchParams.get("id") ||
              "eq." + r.id === parsed.searchParams.get("id"),
          ) || {},
          body,
        );
        return new Response(JSON.stringify({ id: "score" }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (init.method === "POST") {
        tables[table].push({ ...body, id: "created" });
        return new Response(JSON.stringify({ id: "created" }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(tables[table]), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return original(input, init);
  };
}
try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source:
      "(" + fixture.toString() + ")();(" + resultsFixture.toString() + ")();",
  });
  await open("/");
  await evaluate("localStorage.clear();sessionStorage.clear()");
  await login("admin@example.test", "/school/dashboard");
  await evaluate(
    `window.fixtureRequests=[];document.querySelector('a[href="/school/academic-sessions"]').click()`,
  );
  await wait(
    "!!document.querySelector('[data-academic-add]')&&!document.querySelector('.route-progress')",
  );
  const requests = await evaluate("window.fixtureRequests");
  assert.equal(
    requests.filter((url) => url.includes("/auth/v1/user")).length,
    1,
    JSON.stringify(requests),
  );
  assert.equal(
    requests.filter(
      (url) =>
        url.includes("/rest/v1/") &&
        !url.includes("/rpc/") &&
        !url.includes("school_memberships"),
    ).length,
    1,
    JSON.stringify(requests),
  );
  await evaluate(
    "document.querySelector('a[href=\"/school/results\"]').click()",
  );
  await wait(
    "!!document.querySelector('[data-result-scores]')&&!document.querySelector('.route-progress')",
  );
  await evaluate("document.querySelector('[data-result-scores]').click()");
  await wait("!!document.querySelector('dialog input[type=number]')");
  await evaluate(
    "document.querySelector('dialog input[type=number]').value=16;document.querySelector('dialog form').requestSubmit()",
  );
  await wait(
    "!document.querySelector('dialog')&&!document.querySelector('.route-progress')",
  );
  assert.equal(
    await evaluate("window.fixtureTables.assessment_scores[0].score"),
    16,
  );
  await evaluate(
    "document.querySelector('a[href=\"/school/settings/academic\"]').click()",
  );
  await wait(
    "document.querySelector('h1')?.textContent==='Assessment configuration'&&!document.querySelector('.route-progress')",
  );
  assert.ok(
    await evaluate("document.body.textContent.includes('Custom assessments')"),
  );
  assert.equal(
    await evaluate("document.querySelector('[data-result-edit]')===null"),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS browser: one Auth request, one session dataset, result score modal/save and locked assessment configuration",
  );
} finally {
  ws.close();
}
