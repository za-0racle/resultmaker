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
      if (url.includes("/rpc/current_user_requires_password_change")) return respond(false);
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
try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(${fixture.toString()})()`,
  });
  await open("/");
  await evaluate("localStorage.clear();sessionStorage.clear()");
  await open("/register-school");
  await evaluate(
    "document.querySelector('#signup-school').value='Test School';document.querySelector('#signup-name').value='School administrator';document.querySelector('#signup-email').value='newadmin@example.test';document.querySelector('#signup-password').value='test-password';document.querySelector('#signup-form').requestSubmit()",
  );
  await wait(
    "document.querySelector('#signup-message').textContent.includes('confirmation link')",
  );
  assert.equal(
    await evaluate(
      "JSON.parse(sessionStorage.getItem('fixture-signup')).data.onboarding_school_name",
    ),
    "Test School",
  );
  assert.equal(
    await evaluate(
      "JSON.parse(sessionStorage.getItem('fixture-signup')).data.role===undefined",
    ),
    true,
  );
  await login("newadmin@example.test", "/school/dashboard");
  assert.equal(
    await evaluate(
      "JSON.parse(sessionStorage.getItem('fixture-school-request')).school_slug",
    ),
    JSON.parse(await evaluate("sessionStorage.getItem('fixture-signup')")).data.onboarding_school_slug,
  );
  assert.equal(
    await evaluate("!!document.querySelector('#teacher-access-form')"),
    true,
  );
  await evaluate(
    "document.querySelector('#catalog-form [name=name]').value='SS 1';document.querySelector('#catalog-form').requestSubmit()",
  );
  await wait(
    "JSON.parse(sessionStorage.getItem('fixture-action')||'{}').url?.includes('create_school_catalog_item') && !document.querySelector('#catalog-form [type=submit]')?.disabled",
  );
  await evaluate(
    "document.querySelector('#teacher-access-form [name=email]').value='teacher@example.test';document.querySelector('#teacher-access-form [name=class]').value='class-a';document.querySelector('#teacher-access-form [name=subject]').value='subject-a';document.querySelector('#teacher-access-form').requestSubmit()",
  );
  await wait(
    "JSON.parse(sessionStorage.getItem('fixture-action')).url.includes('assign_school_teacher') && !document.querySelector('#teacher-access-form [type=submit]')?.disabled",
  );
  assert.equal(
    await evaluate(
      "JSON.parse(sessionStorage.getItem('fixture-action')).body.teacher_role",
    ),
    "subject_teacher",
  );
  await evaluate(
    "document.querySelector('#teacher-access-role').value='class_teacher';document.querySelector('#teacher-access-role').dispatchEvent(new Event('change'))",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#teacher-subject-field').hidden && document.querySelector('#teacher-subject-field select').disabled",
    ),
    true,
  );
  await logout();
  await login("teacher@example.test", "/teacher/dashboard");
  assert.equal(
    await evaluate("!!document.querySelector('#teacher-access-form')"),
    false,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.workspace-access').textContent.includes('Mathematics')",
    ),
    true,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.workspace-access').textContent.includes('JSS 2')",
    ),
    false,
  );
  await logout();
  await login("class@example.test", "/class-teacher/dashboard");
  assert.equal(
    await evaluate(
      "document.querySelector('.workspace-access').textContent.includes('Mathematics')",
    ),
    false,
  );
  await logout();
  await login("owner@example.test", "/platform");
  assert.equal(
    await evaluate(
      "document.querySelector('.workspace-access').textContent.includes('Other School')",
    ),
    true,
  );
  await evaluate("document.querySelector('[data-school-status]').click()");
  await wait(
    "JSON.parse(sessionStorage.getItem('fixture-action')).url.includes('platform_set_school_status') && !document.querySelector('[data-school-status]')?.disabled",
  );
  assert.equal(
    await evaluate(
      "JSON.parse(sessionStorage.getItem('fixture-action')).body.requested_status",
    ),
    "suspended",
  );
  assert.equal(
    await evaluate(
      "!!document.querySelector('.live-sidebar') && !!document.querySelector('.topbar') && !document.querySelector('.public-nav')",
    ),
    true,
  );
  assert.equal(
    await evaluate("document.querySelectorAll('.live-stat').length"),
    3,
  );
  assert.equal(
    await evaluate("!!document.querySelector('#role-switch')"),
    false,
  );
  await evaluate(
    "document.querySelector('.sidebar a[href=\"/platform/schools\"]').click()",
  );
  await wait(
    "location.pathname === '/platform/schools' && document.querySelector('h1')?.textContent === 'Schools'",
  );
  await evaluate(
    "document.querySelector('.sidebar a[href=\"/platform/subscriptions\"]').click()",
  );
  await wait("!!document.querySelector('.live-unavailable')");
  assert.equal(
    await evaluate("document.querySelector('h1').textContent"),
    "Subscriptions",
  );
  await evaluate(
    "document.querySelector('.sidebar a[href=\"/platform\"]').click()",
  );
  await wait("!!document.querySelector('.live-stat')");
  for (const width of [320, 768, 1600]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width === 320,
    });
    assert.equal(
      await evaluate("document.documentElement.scrollWidth<=innerWidth"),
      true,
      `workspace overflow at ${width}`,
    );
    if (width === 320) {
      await evaluate("document.querySelector('[data-action=menu]').click()");
      assert.equal(
        await evaluate(
          "document.querySelector('.sidebar').classList.contains('open')",
        ),
        true,
      );
      await evaluate("document.querySelector('.live-sidebar-close').click()");
      assert.equal(
        await evaluate(
          "document.querySelector('[data-action=menu]').getAttribute('aria-expanded')",
        ),
        "false",
      );
    }
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(
      `.browser-check/roles-owner-${width}.png`,
      Buffer.from(shot.data, "base64"),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Passed: confirmed school signup/admin redirect, teacher assignment form, role-specific class/subject views, owner school/status controls, dashboard/sidebar navigation, pending-service pages, mobile menu and responsive layout. Simulated API only; no real accounts/emails or hosted changes.",
  );
} finally {
  ws.close();
}
