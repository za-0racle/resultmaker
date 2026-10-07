import { pageHeader, schoolRows, options, field } from "../shared.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Table } from "../../components/Table.js";
import { Badge } from "../../components/Badge.js";
import { Icon } from "../../components/Icon.js";
import { toast } from "../../components/Toast.js";
import { importService } from "../../services/importService.js";
import { escapeHtml } from "../../utils/helpers.js";
let format = "CSV",
  step = 0,
  fileName = "Sample admissions.csv";
const steps = ["Upload", "Map columns", "Validate", "Preview", "Import"];
export function Import() {
  return `${pageHeader("Import students", "A smooth start for every student record.", Button("Back to students", { href: "/school/students", variant: "secondary" }), "Students")}<div class="notice">${Icon("shield")} Prototype walkthrough · Files are not processed. Preview rows are sample data.</div><div class="import-types">${["CSV", "Excel", "Google Sheets"].map((type) => `<button class="card import-type ${format === type ? "selected" : ""}" data-format="${type}"><span class="stat-icon ${type === "CSV" ? "mint" : type === "Excel" ? "blue" : "purple"}">${Icon(type === "Google Sheets" ? "grid" : "file")}</span><strong>Import ${type}</strong><small>${type === "CSV" ? "Simple, comma-separated files" : type === "Excel" ? "Your familiar spreadsheets" : "Connect a shared spreadsheet later"}</small></button>`).join("")}</div>${
    format === "Google Sheets"
      ? Card(
          `<div class="empty-state">${Icon("grid")}<h2>Your spreadsheets, connected.</h2><p>Google Sheets import will be connected in Phase 2. No Google account access is configured.</p>${Button("Try CSV walkthrough", { action: "csv-demo", variant: "secondary" })}</div>`,
        )
      : Card(
          `<ol class="import-steps">${steps.map((label, i) => `<li class="${i === step ? "current" : i < step ? "done" : ""}"><span>${i < step ? "✓" : i + 1}</span>${label}</li>`).join("")}</ol><div class="import-content">${
            step === 0
              ? `<div class="upload-zone">${Icon("upload")}<h2>Bring your student list along.</h2><p>Select a ${format === "CSV" ? ".csv" : ".xlsx"} file, or explore with our sample data.</p><label class="button primary" for="import-file">Choose file</label><input id="import-file" type="file" accept="${format === "CSV" ? ".csv" : ".xlsx,.xls"}" class="sr-only"><p id="chosen-file">${escapeHtml(fileName)}</p><small>Only the filename is read in this prototype.</small></div>`
              : step === 1
                ? `<h2>Match your columns</h2><p>Tell ÈsìAyọ̀ where each piece of information belongs.</p><div class="form-grid">${["Student name", "Admission number", "Gender", "Class"].map((name, i) => field(name, `<select data-map="${i}"><option>${["Full Name", "Student ID", "Gender", "Class"][i]}</option><option>Not mapped</option></select>`)).join("")}</div>`
                : step === 2
                  ? `<div class="validation-summary">${Icon("check")}<h2>Your sample records are ready.</h2><p>20 mock records checked · 0 errors · 0 duplicates</p></div>${Table(
                      ["Check", "Result"],
                      [
                        ["Required fields", Badge("Completed")],
                        ["Admission numbers", Badge("Completed")],
                        ["Class mapping", Badge("Completed")],
                      ],
                    )}`
                  : step === 3
                    ? `<h2>One final look</h2><p>Preview of sample records. Your selected file has not been parsed.</p>${Table(
                        ["Admission number", "Name", "Gender"],
                        schoolRows("students")
                          .slice(0, 5)
                          .map((s) => [
                            escapeHtml(s.admissionNumber),
                            escapeHtml(s.name),
                            s.gender,
                          ]),
                      )}`
                    : `<div class="empty-state">${Icon("check")}<h2>Walkthrough complete</h2><p>A simulated import was recorded. No students were created from a file.</p>${Button("View students", { href: "/school/students" })}</div>`
          }</div><div class="wizard-actions"><button class="button secondary" data-import-back ${step === 0 || step === 4 ? "disabled" : ""}>Back</button><span>${escapeHtml(fileName)}</span>${step < 4 ? Button(step === 3 ? "Simulate import" : "Continue", { action: "import-next", icon: "arrow" }) : Button("Start another import", { action: "import-reset", variant: "secondary" })}</div>`,
        )
  }`;
}
export function bindImport(rerender) {
  document.querySelectorAll("[data-format]").forEach(
    (b) =>
      (b.onclick = () => {
        format = b.dataset.format;
        step = 0;
        fileName = `Sample admissions.${format === "CSV" ? "csv" : "xlsx"}`;
        rerender();
      }),
  );
  document.querySelector("#import-file")?.addEventListener("change", (e) => {
    fileName = e.target.files[0]?.name || fileName;
    document.querySelector("#chosen-file").textContent = fileName;
  });
  document
    .querySelector("[data-import-back]")
    ?.addEventListener("click", () => {
      step--;
      rerender();
    });
  document
    .querySelector('[data-action="import-next"]')
    ?.addEventListener("click", async () => {
      if (
        step === 1 &&
        [...document.querySelectorAll("[data-map]")].some(
          (s) => s.value === "Not mapped",
        )
      )
        return toast("Map all required columns before continuing.", "error");
      if (step === 3) {
        await importService.simulateImport(fileName, 20);
        toast("Simulated import recorded.");
      }
      step++;
      rerender();
    });
  document
    .querySelector('[data-action="import-reset"]')
    ?.addEventListener("click", () => {
      step = 0;
      rerender();
    });
  document
    .querySelector('[data-action="csv-demo"]')
    ?.addEventListener("click", () => {
      format = "CSV";
      step = 0;
      rerender();
    });
}
