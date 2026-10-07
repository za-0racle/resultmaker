// Vite :5173 and isolated headless Chrome CDP :9222 are required.
// Supabase responses are simulated; no accounts or emails are created.
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
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function open(path) {
  await send("Page.navigate", { url: `http://127.0.0.1:5173${path}` });
  await wait("!!document.querySelector('#auth-login,#auth-logout')");
}
async function login(email, expectedPath) {
  await evaluate(
    `document.querySelector('[name=email]').value=${JSON.stringify(email)}; document.querySelector('[name=password]').value='test-password'; document.querySelector('#auth-login').requestSubmit()`,
  );
  await wait(
    `location.pathname===${JSON.stringify(expectedPath)} && !!document.querySelector('#auth-logout')`,
  );
}
function fixture() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = String(input?.url || input);
    if (!url.includes(".supabase.co/")) return originalFetch(input, init);
    const respond = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    const email = sessionStorage.getItem("fixture-user");
    const user = {
      id: "00000000-0000-0000-0000-000000000001",
      email,
      aud: "authenticated",
      role: "authenticated",
      user_metadata: { role: "superAdmin" },
      app_metadata: {},
      created_at: new Date().toISOString(),
    };
    if (url.includes("/auth/v1/token")) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const body = JSON.parse(init.body);
      if (body.email === "wrong@example.test")
        return respond(
          { code: "invalid_credentials", msg: "Invalid login credentials" },
          400,
        );
      sessionStorage.setItem("fixture-user", body.email);
      user.email = body.email;
      const base64 = (object) =>
        btoa(JSON.stringify(object))
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replaceAll("=", "");
      return respond({
        access_token: `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated", role: "authenticated" })}.test`,
        refresh_token: "fixture-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user,
      });
    }
    if (url.includes("/auth/v1/logout")) {
      sessionStorage.removeItem("fixture-user");
      return respond({});
    }
    if (url.includes("/auth/v1/signup"))
      return respond({ ...user, email: JSON.parse(init.body).email });
    if (url.includes("/auth/v1/user"))
      return email ? respond(user) : respond({ msg: "Missing session" }, 401);
    if (url.includes("/rpc/current_user_is_platform_admin"))
      return respond(email === "platform@example.test");
    if (url.includes("/rpc/current_user_requires_password_change"))
      return respond(false);
    if (url.includes("/rest/v1/school_memberships")) {
      if (sessionStorage.getItem("fixture-revoked")) return respond([]);
      const row = (role, id, name) => ({
        school_id: id,
        role,
        status: "active",
        school: { id, name, slug: id, status: "active" },
      });
      if (email === "multi@example.test")
        return respond([
          row("school_admin", "a", "School A"),
          row("subject_teacher", "b", "School B"),
        ]);
      if (email === "none@example.test" || email === "platform@example.test")
        return respond([]);
      const role = {
        "admin@example.test": "school_admin",
        "teacher@example.test": "subject_teacher",
        "class@example.test": "class_teacher",
        "student@example.test": "student",
        "parent@example.test": "parent",
      }[email];
      return respond(role ? [row(role, "a", "School A")] : []);
    }
    return respond({ message: "Unexpected fixture request" }, 500);
  };
}
try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(${fixture.toString()})()`,
  });
  await open("/login");
  await evaluate("localStorage.clear(); sessionStorage.clear()");
  for (const width of [320, 1600]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width === 320,
    });
    await send("Page.navigate", { url: "http://127.0.0.1:5173/" });
    await wait("!!document.querySelector('[data-action=signup-modal]')");
    assert.equal(
      await evaluate(
        "document.querySelector('.public-nav').textContent.includes('Features')",
      ),
      false,
    );
    for (const action of ["login-modal", "signup-modal", "try-demo"]) {
      await evaluate(
        `document.querySelector('[data-action=${action}]').click()`,
      );
      await wait(
        action === "login-modal"
          ? "!!document.querySelector('.account-modal #auth-login')"
          : action === "signup-modal"
            ? "!!document.querySelector('#signup-form')"
            : "!!document.querySelector('.demo-modal .home-workspace-preview')",
      );
      assert.equal(
        await evaluate(
          "(()=>{const d=document.querySelector('.account-modal');return d.scrollWidth<=d.clientWidth && d.getBoundingClientRect().right<=innerWidth;})()",
        ),
        true,
        `${action} overflow at ${width}`,
      );
      if (action === "signup-modal") {
        await evaluate(
          "document.querySelector('#signup-school').value='Test school';document.querySelector('#signup-name').value='Test person';document.querySelector('#signup-email').value='signup@example.test';document.querySelector('#signup-password').value='test-password';document.querySelector('#signup-form').requestSubmit()",
        );
        await wait(
          "document.querySelector('#signup-message')?.textContent.includes('Check your email')",
        );
      }
      await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Escape",
        code: "Escape",
        windowsVirtualKeyCode: 27,
      });
      await wait("!document.querySelector('.account-modal')");
    }
  }
  for (const width of [320, 390, 768, 1024, 1600]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    for (const path of [
      "/",
      "/about",
      "/pricing",
      "/contact",
      "/register-school",
      "/login",
    ]) {
      await send("Page.navigate", { url: `http://127.0.0.1:5173${path}` });
      await wait(
        `location.pathname===${JSON.stringify(path)} && !!document.querySelector('h1')`,
      );
      assert.equal(
        await evaluate("document.documentElement.scrollWidth <= innerWidth"),
        true,
        `${path} overflow at ${width}px`,
      );
      if (path === "/") {
        if (width >= 768) {
          assert.equal(
            await evaluate(
              "(()=>{const h=document.querySelector('.public-nav').getBoundingClientRect(),m=document.querySelector('.public-menu-links').getBoundingClientRect();return Math.abs(m.left+m.width/2-h.left-h.width/2)<2})()",
            ),
            true,
            `Navigation centre at ${width}px`,
          );
          assert.equal(
            await evaluate(
              "getComputedStyle(document.querySelector('.public-menu-links a')).fontSize",
            ),
            "16px",
          );
        }
        assert.equal(
          await evaluate(
            "getComputedStyle(document.querySelector('.home-hero')).backgroundColor",
          ),
          "rgb(251, 250, 245)",
        );
        assert.equal(
          await evaluate(
            "getComputedStyle(document.querySelector('.skip-link')).clipPath",
          ),
          "inset(50%)",
        );
        assert.equal(
          await evaluate(
            "getComputedStyle(document.querySelector('.public-nav')).backgroundColor",
          ),
          "rgb(11, 31, 75)",
        );
        await wait(
          "document.querySelector('.official-logo-frame img')?.naturalWidth > 0",
        );
        assert.equal(
          await evaluate(
            "document.querySelector('.official-logo-frame img').getAttribute('src')",
          ),
          "/files/esiayo-logo-navy-lowercase.svg",
        );
        if (width < 768) {
          await evaluate(
            "document.querySelector('.public-menu-toggle').click()",
          );
          assert.equal(
            await evaluate(
              "document.querySelector('.public-menu-toggle').getAttribute('aria-expanded')",
            ),
            "true",
          );
          assert.equal(
            await evaluate(
              "getComputedStyle(document.querySelector('#public-navigation')).display",
            ),
            "grid",
          );
          await send("Input.dispatchKeyEvent", {
            type: "keyDown",
            key: "Escape",
            code: "Escape",
            windowsVirtualKeyCode: 27,
          });
          assert.equal(
            await evaluate(
              "document.querySelector('.public-menu-toggle').getAttribute('aria-expanded')",
            ),
            "false",
          );
        }
        const screenshot = await send("Page.captureScreenshot", {
          format: "png",
        });
        await writeFile(
          `.browser-check/home-${width}.png`,
          Buffer.from(screenshot.data, "base64"),
        );
      }
      if (path === "/login") {
        const fields = await evaluate(
          `Array.from(document.querySelectorAll('#auth-login .field')).map(field => { const label=field.querySelector('label').getBoundingClientRect(); const input=field.querySelector('input').getBoundingClientRect(); return {labelBottom:label.bottom,inputTop:input.top,width:input.width,container:field.getBoundingClientRect().width}; })`,
        );
        assert.equal(fields.length, 2);
        for (const field of fields) {
          assert.ok(field.inputTop >= field.labelBottom);
          assert.ok(Math.abs(field.width - field.container) < 2);
        }
        const screenshot = await send("Page.captureScreenshot", {
          format: "png",
        });
        await writeFile(
          `.browser-check/login-${width}.png`,
          Buffer.from(screenshot.data, "base64"),
        );
      }
    }
  }
  await evaluate(
    "document.querySelector('[name=password]').value='visibility-check'; document.querySelector('#password-toggle').click()",
  );
  assert.equal(
    await evaluate("document.querySelector('[name=password]').type"),
    "text",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#password-toggle').getAttribute('aria-label')",
    ),
    "Hide password",
  );
  await evaluate("document.querySelector('#password-toggle').click()");
  assert.equal(
    await evaluate("document.querySelector('[name=password]').type"),
    "password",
  );
  assert.equal(
    await evaluate("document.querySelector('[name=password]').value"),
    "visibility-check",
  );
  assert.equal(await evaluate("location.pathname"), "/login");
  await evaluate("document.querySelector('[data-action=login-modal]').click()");
  await wait("!!document.querySelector('.account-modal #auth-login')");
  await evaluate(
    "const dialog=document.querySelector('.account-modal');dialog.querySelector('[name=email]').value='wrong@example.test';dialog.querySelector('[name=password]').value='test-password';dialog.querySelector('#auth-login').requestSubmit()",
  );
  await wait(
    "document.querySelector('.account-modal #auth-message')?.textContent.includes('Sign-in failed')",
  );
  assert.equal(
    await evaluate("document.querySelector('#app #auth-message').textContent"),
    "",
  );
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.account-modal')).animationName",
    ),
    "none",
  );
  await send("Emulation.setEmulatedMedia", { features: [] });
  await evaluate(
    "document.querySelector('.account-modal .modal-close').click()",
  );
  await open("/school/dashboard");
  assert.equal(await evaluate("location.pathname"), "/login");
  assert.equal(
    await evaluate("!!document.querySelector('#role-switch,[name=role]')"),
    false,
  );
  await evaluate(
    "document.querySelector('[name=email]').value='wrong@example.test'; document.querySelector('[name=password]').value='wrong'; document.querySelector('#auth-login').requestSubmit()",
  );
  await wait(
    "document.querySelector('#auth-message')?.textContent.includes('Sign-in failed')",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#auth-login [type=submit]').hasAttribute('aria-busy')",
    ),
    false,
  );
  for (const [email, path] of [
    ["admin", "/school/dashboard"],
    ["teacher", "/teacher/dashboard"],
    ["class", "/class-teacher/dashboard"],
    ["student", "/student/dashboard"],
    ["parent", "/parent/dashboard"],
    ["platform", "/platform"],
  ]) {
    await login(`${email}@example.test`, path);
    await open(path); // Session restoration on a full refresh.
    assert.equal(await evaluate("location.pathname"), path);
    await open(email === "platform" ? "/school/dashboard" : "/platform");
    assert.equal(await evaluate("location.pathname"), path);
    assert.equal(
      await evaluate("document.body.textContent.includes('Greenfield')"),
      false,
    );
    await evaluate("document.querySelector('#auth-logout').click()");
    await wait("!!document.querySelector('#auth-login')");
  }
  await login("multi@example.test", "/workspaces");
  assert.equal(
    await evaluate("document.querySelectorAll('[data-workspace]').length"),
    2,
  );
  await evaluate(
    "document.querySelector('[data-workspace=\"b:subjectTeacher\"]').click()",
  );
  await wait(
    "location.pathname==='/teacher/dashboard' && document.querySelector('h1')?.textContent==='School B'",
  );
  await evaluate(
    "sessionStorage.setItem('esiayo-workspace:00000000-0000-0000-0000-000000000001','platform:superAdmin')",
  );
  await open("/platform");
  assert.equal(
    await evaluate("document.querySelectorAll('[data-workspace]').length"),
    2,
  );
  await evaluate("sessionStorage.setItem('fixture-revoked','true')");
  await open("/teacher/dashboard");
  assert.equal(
    await evaluate("document.querySelector('h1').textContent"),
    "No active workspace assigned",
  );
  await evaluate("sessionStorage.removeItem('fixture-revoked')");
  await evaluate("document.querySelector('#auth-logout').click()");
  await wait("!!document.querySelector('#auth-login')");
  await login("none@example.test", "/workspaces");
  assert.equal(
    await evaluate("document.querySelector('h1').textContent"),
    "No active workspace assigned",
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
  );
  await evaluate("document.querySelector('#auth-logout').click()");
  await wait("!!document.querySelector('#auth-login')");
  await evaluate("document.querySelector('.skip-link').focus()");
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.skip-link')).clipPath",
    ),
    "none",
  );
  await evaluate(
    "document.querySelector('.skip-link').blur();document.querySelector('[name=email]').value='wrong@example.test';document.querySelector('[name=password]').value='test-password';document.querySelector('#auth-login').requestSubmit()",
  );
  await wait(
    "document.querySelector('#auth-login [type=submit]')?.getAttribute('aria-busy')==='true'",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#auth-login [type=submit]').disabled",
    ),
    true,
  );
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('#auth-login [type=submit]'),'::before').borderTopStyle",
    ),
    "solid",
  );
  await wait(
    "document.querySelector('#auth-message')?.textContent.includes('Sign-in failed')",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#auth-login [type=submit]').hasAttribute('aria-busy')",
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Passed: anonymous guard, invalid login, all six role redirects, refresh, cross-role denial, sign-out, multiple-school selection, forged selection, revoked access, unassigned account, mobile layout and no sample records. Simulated Supabase responses only.",
  );
} finally {
  ws.close();
}
