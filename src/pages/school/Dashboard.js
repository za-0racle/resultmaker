import { context } from "../../app/context.js";
import { activity } from "../../data/mockData.js";
import { schoolRows, className, pageHeader } from "../shared.js";
import { Card, CardHeader } from "../../components/Card.js";
import { Button } from "../../components/Button.js";
import { Badge } from "../../components/Badge.js";
import { Icon } from "../../components/Icon.js";
import { escapeHtml, initials } from "../../utils/helpers.js";
export function Dashboard() {
  const students = schoolRows("students"),
    results = schoolRows("results").filter(
      (r) =>
        r.sessionId === context.academicSession.id &&
        r.termId === context.term.id,
    ),
    classes = schoolRows("classes");
  const approved = results.filter((r) =>
    ["Approved", "Published"].includes(r.status),
  ).length;
  const pending = results.filter((r) =>
    ["Submitted", "Under Review"].includes(r.status),
  ).length;
  const stats = [
    [
      "Total students",
      students.length,
      "users",
      "Across all classes",
      "+20 this session",
      "mint",
    ],
    [
      "Teaching staff",
      schoolRows("teachers").length,
      "users",
      "Supporting every learner",
      "All active",
      "blue",
    ],
    [
      "Active classes",
      classes.length,
      "school",
      "Primary & secondary",
      "2 sections",
      "purple",
    ],
    [
      "Results pending",
      pending,
      "file",
      "Ready for your review",
      "Action needed",
      "amber",
    ],
  ];
  return `${pageHeader("School overview", "A clear picture of your school, all in one place.", Button("View reports", { href: "/school/reports", variant: "secondary", icon: "chart" }) + Button("Enter results", { href: "/school/results/entry", icon: "plus" }), "Overview")}
 <section class="welcome-banner"><div><span class="eyebrow">A NEW DAY. A NEW POSSIBILITY.</span><h2>Good morning, ${escapeHtml(context.user.name.split(" ")[0])} <span class="sun" aria-hidden="true">&#9728;</span></h2><p>Great learning starts with a little clarity. Here’s where things stand.</p><div class="welcome-meta"><span>${Icon("calendar")} ${escapeHtml(context.academicSession.name)}</span><span class="term-pill">${escapeHtml(context.term.name)}</span><span class="banner-status"><i></i> Session in progress</span></div></div><div class="banner-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-book"><span></span><span></span><span></span></div><div class="art-check">${Icon("check")}</div><div class="art-dot"></div></div></section>
 <div class="stats-grid">${stats.map(([label, value, icon, detail, trend, tone]) => `<section class="card stat-card"><div class="stat-label">${label}<span class="stat-icon ${tone}">${Icon(icon)}</span></div><strong class="stat-number">${value}</strong><div class="stat-foot"><span>${detail}</span><small class="${tone}">${trend}</small></div></section>`).join("")}</div>
 <div class="dashboard-grid"><div class="dashboard-main">${Card(
   `${CardHeader("Result completion", `<a href="/school/results" data-link class="text-link">View all results ${Icon("arrow")}</a>`)}<p class="card-subtitle">First Term · ${escapeHtml(context.academicSession.name)} academic session</p><div class="completion-body"><div class="donut" role="img" aria-label="${Math.round((approved / (results.length || 1)) * 100)} percent of result batches approved"><svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="65" class="donut-track"/><circle cx="80" cy="80" r="65" class="donut-fill" stroke-dasharray="${(approved / (results.length || 1)) * 408} 408"/></svg><div><strong>${Math.round((approved / (results.length || 1)) * 100)}<small>%</small></strong><span>Approved</span></div></div><div class="completion-legend">${[
     ["Approved & published", approved, "teal"],
     ["Awaiting review", pending, "gold"],
     ["In progress", results.length - approved - pending, "slate"],
   ]
     .map(
       ([label, count, color]) =>
         `<div><span class="legend-dot ${color}"></span><span>${label}</span><strong>${count}<small> subjects</small></strong></div>`,
     )
     .join(
       "",
     )}<div class="completion-note">${Icon("shield")} Every result gets the attention it deserves.</div></div></div><div class="card-bottom">${Icon("clock")} ${pending} subject result batches are waiting for review.${Button("Review results", { href: "/school/results/review", variant: "secondary", icon: "arrow" })}</div>`,
   "completion-card",
 )}
 ${Card(
   `${CardHeader("Classes needing attention", '<span class="count-label">3 classes</span>')}<div class="attention-table">${classes
     .slice(3)
     .map(
       (c, i) =>
         `<div class="attention-row"><span class="class-symbol ${["mint", "blue", "purple"][i]}">${Icon("school")}</span><div><strong>${escapeHtml(c.name)}</strong><small>${schoolRows("students").filter((s) => s.classId === c.id).length} students · ${escapeHtml(c.section)}</small></div><div class="attention-progress"><progress max="100" value="${[78, 62, 45][i]}" aria-label="${escapeHtml(c.name)} result completion"></progress><span>${[78, 62, 45][i]}%</span></div><span class="badge warning">${[2, 3, 4][i]} subjects pending</span><a href="/school/classes/${c.id}" data-link class="icon-button" aria-label="View ${escapeHtml(c.name)}">${Icon("chevron")}</a></div>`,
     )
     .join("")}</div>`,
   "attention-card",
 )}
 ${Card(
   `${CardHeader("Recent imports", `<a class="text-link" href="/school/students/import" data-link>Import students ${Icon("arrow")}</a>`)}${schoolRows(
     "imports",
   )
     .slice(-2)
     .reverse()
     .map(
       (item) =>
         `<div class="import-row"><span class="file-symbol">${Icon("file")}</span><div><strong>${escapeHtml(item.name)}</strong><small>${item.count} records · ${escapeHtml(item.date)}</small></div>${Badge(item.status)}</div>`,
     )
     .join("")}`,
 )}
 </div><div class="dashboard-aside">${Card(
   `${CardHeader("Quick actions")}<p class="card-subtitle">Less admin. More impact.</p><div class="quick-actions">${[
     [
       "Add a student",
       "Bring a new learner onboard",
       "users",
       "add-student",
       null,
     ],
     [
       "Import students",
       "Upload a class in a few clicks",
       "upload",
       null,
       "/school/students/import",
     ],
     [
       "Enter scores",
       "Keep results moving forward",
       "file",
       null,
       "/school/results/entry",
     ],
     [
       "Generate a report",
       "Turn progress into perspective",
       "chart",
       null,
       "/school/reports",
     ],
   ]
     .map(
       ([title, desc, icon, action, href]) =>
         `<${href ? "a" : "button"} ${href ? `href="${href}" data-link` : `data-action="${action}"`} class="quick-action"><span>${Icon(icon)}</span><div><strong>${title}</strong><small>${desc}</small></div>${Icon("chevron")}</${href ? "a" : "button"}>`,
     )
     .join("")}</div>`,
 )}
 ${Card(`${CardHeader("Recent activity", '<span class="live-dot"></span>')}<div class="activity-list">${activity.map((a, i) => `<div class="activity-item"><span class="activity-avatar ${["mint", "blue", "purple", "amber"][i]}">${initials(a.name)}</span><div><p><strong>${escapeHtml(a.name)}</strong> ${escapeHtml(a.action)}</p><small>${escapeHtml(a.detail)}</small><time>${a.time}</time></div></div>`).join("")}</div><a class="activity-link" href="/school/results/review" data-link>View result activity ${Icon("arrow")}</a>`)}
 <div class="term-reminder">${Icon("calendar")}<div><strong>One term. So much potential.</strong><p>Keep your class records up to date for a smoother result season.</p><a href="/school/settings/academic" data-link>Academic settings ${Icon("arrow")}</a></div></div></div></div>`;
}
