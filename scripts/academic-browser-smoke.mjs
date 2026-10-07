// Isolated visual/workflow harness for the original mock modules; never bypasses production Auth.
// Requires local Vite :5173 and isolated Chrome CDP :9222.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
await writeFile(
  ".browser-check/academic-preview.html",
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/src/styles/variables.css"><link rel="stylesheet" href="/src/styles/layout.css"><link rel="stylesheet" href="/src/styles/components.css"><link rel="stylesheet" href="/src/styles/responsive.css"><link rel="stylesheet" href="/src/styles/brand-and-reports.css"><link rel="stylesheet" href="/src/styles/public-site.css"><link rel="stylesheet" href="/src/styles/main.css"><link rel="stylesheet" href="/src/styles/academic.css"></head><body><div id="app"></div><div id="toasts" aria-live="polite"></div><script type="module" src="/scripts/academic-preview.js"></script></body></html>',
);
const tabs = await fetch("http://127.0.0.1:9222/json").then((r) => r.json());
const tab = tabs.find((t) => t.type === "page");
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) =>
  ws.addEventListener("open", resolve, { once: true }),
);
let sequence = 0;
const pending = new Map(),
  errors = [];
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    message.error ? task.reject(message.error) : task.resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression: `(()=>eval(${JSON.stringify(expression)}))()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function open(path) {
  await evaluate(`window.previewRender(${JSON.stringify(path)})`);
  for (let i = 0; i < 100; i++) {
    if (
      await evaluate(
        "!!document.querySelector('h1') || !!document.querySelector('.empty-state')",
      )
    )
      return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Page did not render: ${path}`);
}
await send("Runtime.enable");
await send("Page.enable");
await evaluate("localStorage.removeItem('resultmaker-prototype-v1')");
await send("Page.navigate", {
  url: "http://127.0.0.1:5173/.browser-check/academic-preview.html",
});
for (let attempt = 0; attempt < 100; attempt++) {
  if (await evaluate('typeof window.previewRender === "function"')) break;
  await new Promise((resolve) => setTimeout(resolve, 100));
}
await open("/school/dashboard");
assert.equal(
  await evaluate("document.querySelector('.official-brand img').alt"),
  "ÈsìAyọ̀ the result maker",
  "Official brand",
);
assert.equal(
  await evaluate(
    "getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()",
  ),
  "#0b1f3a",
  "Academic navy palette",
);
await evaluate("localStorage.removeItem('resultmaker-prototype-v1')");
await open("/school/dashboard");
const paths = process.argv.includes("--interactions-only")
  ? []
  : await evaluate(
      "import('/src/app/router.js').then(m=>m.routes.filter(r=>!['student','parent'].includes(r.scope) && r.kind!=='workspaces').map(r=>r.path.replace(':id',r.path.startsWith('/platform')?'00000000-0000-4000-8000-000000000001':r.path.includes('/students')?'00000000-0000-4000-8000-000000000100':'00000000-0000-4000-8000-000000000010')))",
    );
for (const path of paths) {
  await open(path);
  assert.equal(await evaluate("!!document.querySelector('h1')"), true, path);
  assert.equal(
    await evaluate(
      "document.body.textContent.includes('Unable to load this view')",
    ),
    false,
    path,
  );
}
await open("/school/students");
for (const width of [320, 768, 1024, 1440]) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  for (const path of [
    "/school/dashboard",
    "/school/students",
    "/school/teachers",
    "/school/classes",
    "/school/subjects",
    "/school/academic-sessions",
    "/school/students/import",
    "/school/settings/templates",
    "/school/settings/grading",
    "/school/reports/student",
    "/school/reports/broadsheet",
    "/teacher/results/entry",
    "/class-teacher/comments",
    "/platform/schools",
  ]) {
    await open(path);
    assert.equal(
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
      true,
      `${path} overflow at ${width}px`,
    );
  }
}
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await open("/school/students");
await evaluate(
  "const search=document.querySelector('#student-search');search.value='Amara';search.dispatchEvent(new Event('input',{bubbles:true}));",
);
await new Promise((r) => setTimeout(r, 100));
assert.equal(
  await evaluate("document.querySelectorAll('tbody tr').length"),
  1,
  "Student search",
);
await evaluate("document.querySelector('[data-action=add-student]').click()");
assert.equal(
  await evaluate("!!document.querySelector('dialog[open]')"),
  true,
  "Add student modal",
);
await evaluate(
  "const f=document.querySelector('dialog form');f.elements.name.value='Test Learner';f.elements.admissionNumber.value='DEMO/TEST/001';f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));",
);
await new Promise((r) => setTimeout(r, 100));
assert.equal(
  await evaluate(
    "JSON.parse(localStorage.getItem('resultmaker-prototype-v1')).data.students.length",
  ),
  21,
  "Student persisted",
);
await open("/teacher/results/entry");
await evaluate(
  "const term=document.querySelector('#entry-term');term.selectedIndex=1;term.dispatchEvent(new Event('change',{bubbles:true}));",
);
await new Promise((r) => setTimeout(r, 100));
await evaluate(
  "document.querySelectorAll('.score-input').forEach(input=>{input.value=input.dataset.component==='exam'?'60':'9';input.dispatchEvent(new Event('input',{bubbles:true}));});",
);
assert.equal(
  await evaluate("document.querySelector('[data-total]').textContent"),
  "87",
  "Automatic total",
);
assert.equal(
  await evaluate("document.querySelector('[data-grade]').textContent"),
  "A",
  "Grade preview",
);
await evaluate("document.querySelector('[data-action=save-draft]').click()");
await new Promise((r) => setTimeout(r, 100));
assert.equal(
  await evaluate("document.querySelector('#draft-status').textContent"),
  "Batch status: Draft",
  "Draft persistence",
);
await evaluate(
  "document.querySelector('[data-action=submit-results]').click()",
);
await new Promise((r) => setTimeout(r, 100));
assert.equal(
  await evaluate("document.querySelector('#draft-status').textContent"),
  "Batch status: Submitted",
  "Submit workflow",
);
const batchId = await evaluate(
  "JSON.parse(localStorage.getItem('resultmaker-prototype-v1')).data.results.at(-1).id",
);
assert.equal(
  await evaluate(
    "[...document.querySelectorAll('.score-input')].every(i=>i.disabled)",
  ),
  true,
  "Submitted score inputs are locked",
);
await open("/school/results/review");
for (const nextStatus of ["Under Review", "Approved", "Published"]) {
  await evaluate(
    `document.querySelector('[data-review="${batchId}"]').click()`,
  );
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(
    await evaluate(
      `JSON.parse(localStorage.getItem('resultmaker-prototype-v1')).data.results.find(r=>r.id==='${batchId}').status`,
    ),
    nextStatus,
    "Review transition",
  );
}
await open("/class-teacher/comments");
const commentStudent = await evaluate(
  "document.querySelector('textarea').name",
);
await evaluate(
  "const form=document.querySelector('#comments-form');form.querySelector('textarea').value='Great effort this term.';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));",
);
await open(`/school/reports/student?student=${commentStudent}`);
assert.equal(
  await evaluate(
    "document.querySelector('.report-comments').textContent.includes('Great effort this term.')",
  ),
  true,
  "Saved class comment appears in report",
);
await open("/school/students/import");
for (let i = 0; i < 4; i++) {
  await evaluate("document.querySelector('[data-action=import-next]').click()");
  await new Promise((r) => setTimeout(r, 100));
}
assert.equal(
  await evaluate("document.body.textContent.includes('Walkthrough complete')"),
  true,
  "Import simulation",
);
await open("/school/settings/grading");
await evaluate(
  "document.querySelector('[name=\"0-min\"]').value='80';document.querySelector('#grading-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));",
);
await new Promise((r) => setTimeout(r, 50));
assert.equal(
  await evaluate(
    "document.querySelector('#toasts').textContent.includes('no gaps or overlaps')",
  ),
  true,
  "Grading gap validation",
);
await open("/school/settings/templates");
await evaluate(
  "const form=document.querySelector('#result-template-form');form.elements.reportTitle.value='First Term Progress Report';form.querySelector('[data-label]').value='Class test';form.elements.affectiveItems.value+='\\nEmpathy';form.elements['section-psychomotor'].checked=false;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));",
);
await new Promise((r) => setTimeout(r, 100));
assert.equal(
  await evaluate(
    "JSON.parse(localStorage.getItem('resultmaker-prototype-v1')).data.schools[0].resultConfiguration.assessments[0].label",
  ),
  "Class test",
  "School-specific assessment saved",
);
await open("/school/reports/student");
assert.equal(
  await evaluate(
    "document.querySelector('.report-card').textContent.includes('First Term Progress Report')",
  ),
  true,
  "Saved report title",
);
assert.equal(
  await evaluate(
    "document.querySelector('.report-card').textContent.includes('Empathy')",
  ),
  true,
  "Custom affective trait",
);
assert.equal(
  await evaluate(
    "document.querySelector('.report-card').textContent.includes('Psychomotor domain')",
  ),
  false,
  "Hidden report domain",
);
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1900,
  deviceScaleFactor: 1,
  mobile: false,
});
await new Promise((r) => setTimeout(r, 350));
await evaluate("document.querySelector('#toasts').replaceChildren()");
const reportImage = await send("Page.captureScreenshot", { format: "png" });
await writeFile(
  ".browser-check/report-preview.png",
  Buffer.from(reportImage.data, "base64"),
);
await open("/teacher/results/entry");
await evaluate(
  "const term=document.querySelector('#entry-term');term.selectedIndex=2;term.dispatchEvent(new Event('change',{bubbles:true}));",
);
await new Promise((r) => setTimeout(r, 100));
assert.equal(
  await evaluate(
    "document.querySelector('thead').textContent.includes('Class test')",
  ),
  true,
  "New score sheets use school assessment structure",
);
await evaluate(
  "const initialTerm=document.querySelector('#entry-term');initialTerm.selectedIndex=0;initialTerm.dispatchEvent(new Event('change',{bubbles:true}));",
);
await new Promise((r) => setTimeout(r, 100));
assert.equal(
  await evaluate(
    "document.querySelector('thead').textContent.includes('CA 1')",
  ),
  true,
  "Existing batches retain assessment structure",
);
await open("/school/dashboard");
await evaluate("localStorage.removeItem('resultmaker-prototype-v1')");
await open("/school/dashboard");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});
await new Promise((r) => setTimeout(r, 350));
await evaluate("document.querySelector('#toasts').replaceChildren()");
const desktop = await send("Page.captureScreenshot", { format: "png" });
await writeFile(
  ".browser-check/dashboard-desktop.png",
  Buffer.from(desktop.data, "base64"),
);
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await new Promise((r) => setTimeout(r, 350));
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= innerWidth"),
  true,
  "Mobile page overflow",
);
const mobile = await send("Page.captureScreenshot", { format: "png" });
await writeFile(
  ".browser-check/dashboard-mobile.png",
  Buffer.from(mobile.data, "base64"),
);
await open("/teacher/results/entry");
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= innerWidth"),
  true,
  "Mobile score table overflow",
);
await open("/school/reports/student");
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= innerWidth"),
  true,
  "Mobile report overflow",
);
await evaluate("localStorage.removeItem('resultmaker-prototype-v1')");
await open("/school/dashboard");
assert.deepEqual(errors, [], "Browser runtime errors");
console.log(
  `Passed: ${paths.length} route checks, branding/palette, student search/create, score total/grade/draft/submit, review/approve/publish, report comments, template settings, assessment structure preservation, mock import, grading validation, desktop/mobile overflow checks. No runtime exceptions.`,
);
ws.close();
