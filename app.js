const STORAGE_KEY = "trainingSessionsV3";

let sessions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let gradeChart = null;
let minutesChart = null;
let loadChart = null;

const gradeMap = { V0: 0, V1: 1, V2: 2, V3: 3 };
const gradeReverseMap = { 0: "V0", 1: "V1", 2: "V2", 3: "V3" };

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupButtons();
  setupLiveLoadPreview();
  setToday();
  renderAll();
});

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      showTab(button.dataset.tab, button);
    });
  });
}

function showTab(tabId, activeButton) {
  document.querySelectorAll(".tab-section").forEach((section) => section.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((button) => button.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  activeButton.classList.add("active");

  renderAll();
}

function setupButtons() {
  document.getElementById("saveBtn").addEventListener("click", addSession);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("clearBtn").addEventListener("click", clearData);
  document.getElementById("importFile").addEventListener("change", importData);
  document.getElementById("parseBeta7Btn").addEventListener("click", parseBeta7Input);
}

function setupLiveLoadPreview() {
  document.getElementById("duration").addEventListener("input", updateLoadPreview);
  document.getElementById("rpe").addEventListener("change", updateLoadPreview);
  updateLoadPreview();
}

function updateLoadPreview() {
  const duration = Number(document.getElementById("duration").value || 0);
  const rpe = Number(document.getElementById("rpe").value || 0);
  document.getElementById("loadPreview").textContent = duration * rpe;
}

function setToday() {
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.valueAsDate = new Date();
}

function parseBeta7Input() {
  const raw = document.getElementById("beta7Raw").value.trim();

  if (!raw) {
    alert("Paste a BETA7 QR URL first.");
    return;
  }

  const decoded = safeDecode(raw);
  const url = extractBeta7Url(decoded);

  if (!url) {
    alert("No valid BETA7 route URL found.");
    return;
  }

  document.getElementById("beta7Url").value = url;

  const routeId = extractBeta7RouteId(url);
  if (routeId) {
    document.getElementById("beta7RouteId").value = routeId;
  }
}

function safeDecode(value) {
  let output = value;

  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(output);
      if (decoded === output) return decoded;
      output = decoded;
    } catch {
      return output;
    }
  }

  return output;
}

function extractBeta7Url(text) {
  const match = text.match(/https:\/\/beta7\.app\/route\/[^\s"'<>]+/i);
  if (!match) return "";

  let url = match[0];

  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch {
    return url;
  }
}

function extractBeta7RouteId(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const routeIndex = parts.indexOf("route");

    if (routeIndex === -1 || !parts[routeIndex + 1]) return "";

    return parts[routeIndex + 1];
  } catch {
    const match = url.match(/\/route\/([^/]+)/);
    return match ? match[1] : "";
  }
}

function addSession() {
  const date = document.getElementById("date").value;
  const type = document.getElementById("type").value;
  const grade = document.getElementById("grade").value;
  const duration = Number(document.getElementById("duration").value || 0);
  const problems = Number(document.getElementById("problems").value || 0);
  const distance = Number(document.getElementById("distance").value || 0);
  const rpe = Number(document.getElementById("rpe").value || 0);
  const pain = Number(document.getElementById("pain").value || 0);
  const fingerPain = document.getElementById("fingerPain").checked;
  const shoulderPain = document.getElementById("shoulderPain").checked;
  const sleep = document.getElementById("sleep").value;
  const energy = document.getElementById("energy").value;
  const notes = document.getElementById("notes").value.trim();

  if (!date) {
    alert("Add a date.");
    return;
  }

  if (duration <= 0 && type !== "Rest") {
    alert("Add duration in minutes.");
    return;
  }

  const beta7Raw = document.getElementById("beta7Raw").value.trim();
  const beta7Url = document.getElementById("beta7Url").value.trim();
  const beta7RouteId = document.getElementById("beta7RouteId").value.trim();

  const boulder = {
    source: beta7Url.includes("beta7.app") ? "BETA7" : "",
    raw: beta7Raw,
    url: beta7Url,
    routeId: beta7RouteId,
    gym: document.getElementById("boulderGym").value.trim(),
    sector: document.getElementById("boulderSector").value.trim(),
    routeNumber: document.getElementById("boulderNumber").value.trim(),
    grade: document.getElementById("boulderGrade").value.trim(),
    circuit: document.getElementById("boulderCircuit").value.trim(),
    style: document.getElementById("boulderStyle").value.trim(),
    attempts: Number(document.getElementById("boulderAttempts").value || 0),
    sent: document.getElementById("boulderSent").checked,
    flashed: document.getElementById("boulderFlashed").checked
  };

  const trainingLoad = duration * rpe;

  const session = {
    id: Date.now(),
    date,
    type,
    grade,
    duration,
    problems,
    distance,
    rpe,
    pain,
    fingerPain,
    shoulderPain,
    sleep,
    energy,
    trainingLoad,
    boulder,
    notes
  };

  sessions.push(session);
  saveData();
  clearForm();
  renderAll();
}

function clearForm() {
  document.getElementById("type").value = "Volume Climbing";
  document.getElementById("grade").value = "";
  document.getElementById("duration").value = "";
  document.getElementById("problems").value = "";
  document.getElementById("distance").value = "";
  document.getElementById("rpe").value = "4";
  document.getElementById("pain").value = "0";
  document.getElementById("fingerPain").checked = false;
  document.getElementById("shoulderPain").checked = false;
  document.getElementById("sleep").value = "OK";
  document.getElementById("energy").value = "Normal";
  document.getElementById("notes").value = "";

  document.getElementById("beta7Raw").value = "";
  document.getElementById("beta7Url").value = "";
  document.getElementById("beta7RouteId").value = "";
  document.getElementById("boulderGym").value = "";
  document.getElementById("boulderSector").value = "";
  document.getElementById("boulderNumber").value = "";
  document.getElementById("boulderGrade").value = "";
  document.getElementById("boulderCircuit").value = "";
  document.getElementById("boulderStyle").value = "";
  document.getElementById("boulderAttempts").value = "";
  document.getElementById("boulderSent").checked = false;
  document.getElementById("boulderFlashed").checked = false;

  setToday();
  updateLoadPreview();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function deleteSession(id) {
  sessions = sessions.filter((session) => session.id !== id);
  saveData();
  renderAll();
}

function clearData() {
  if (!confirm("Delete all saved training data?")) return;
  sessions = [];
  saveData();
  renderAll();
}

function exportData() {
  downloadFile("training-sessions-backup.json", JSON.stringify(sessions, null, 2), "application/json");
}

function exportCsv() {
  const headers = [
    "date",
    "type",
    "grade",
    "duration",
    "rpe",
    "trainingLoad",
    "pain",
    "fingerPain",
    "shoulderPain",
    "sleep",
    "energy",
    "beta7Url",
    "beta7RouteId",
    "boulderGym",
    "boulderSector",
    "boulderNumber",
    "boulderGrade",
    "boulderCircuit",
    "boulderAttempts",
    "boulderSent",
    "boulderFlashed",
    "notes"
  ];

  const rows = sessions.map((s) => {
    const b = s.boulder || {};
    return [
      s.date,
      s.type,
      s.grade,
      s.duration,
      s.rpe,
      s.trainingLoad,
      s.pain,
      s.fingerPain,
      s.shoulderPain,
      s.sleep,
      s.energy,
      b.url || "",
      b.routeId || "",
      b.gym || "",
      b.sector || "",
      b.routeNumber || "",
      b.grade || "",
      b.circuit || "",
      b.attempts || 0,
      b.sent || false,
      b.flashed || false,
      s.notes || ""
    ].map(csvEscape).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  downloadFile("training-sessions.csv", csv, "text/csv");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);

      if (!Array.isArray(imported)) {
        alert("Invalid file. Expected a JSON array.");
        return;
      }

      sessions = imported.map(normalizeImportedSession);
      saveData();
      renderAll();
      alert("Data imported.");
    } catch {
      alert("Could not import file.");
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

function normalizeImportedSession(session) {
  const duration = Number(session.duration || 0);
  const rpe = Number(session.rpe || 4);

  return {
    id: session.id || Date.now() + Math.random(),
    date: session.date || new Date().toISOString().slice(0, 10),
    type: session.type || "Volume Climbing",
    grade: session.grade || "",
    duration,
    problems: Number(session.problems || 0),
    distance: Number(session.distance || 0),
    rpe,
    pain: Number(session.pain || 0),
    fingerPain: Boolean(session.fingerPain),
    shoulderPain: Boolean(session.shoulderPain),
    sleep: session.sleep || "OK",
    energy: session.energy || "Normal",
    trainingLoad: Number(session.trainingLoad || duration * rpe),
    boulder: session.boulder || {},
    notes: session.notes || ""
  };
}

function renderAll() {
  renderDashboard();
  renderHistory();
  renderGradeChart();
  renderMinutesChart();
  renderLoadChart();
}

function renderDashboard() {
  const weekSessions = getCurrentWeekSessions();
  const previousWeekSessions = getPreviousWeekSessions();

  const weekMinutes = sum(weekSessions, "duration");
  const weekLoad = sum(weekSessions, "trainingLoad");
  const previousWeekLoad = sum(previousWeekSessions, "trainingLoad");

  const painAverage = weekSessions.length ? round(sum(weekSessions, "pain") / weekSessions.length, 1) : 0;
  const highestGrade = getHighestGrade(weekSessions);
  const hardSessions = weekSessions.filter((s) => Number(s.rpe) >= 7).length;
  const bouldersLogged = weekSessions.filter((s) => hasBoulder(s)).length;
  const beta7Routes = weekSessions.filter((s) => s.boulder && s.boulder.source === "BETA7").length;

  document.getElementById("weekSessions").textContent = weekSessions.length;
  document.getElementById("weekMinutes").textContent = weekMinutes;
  document.getElementById("weekLoad").textContent = weekLoad;
  document.getElementById("weekPain").textContent = painAverage;
  document.getElementById("weekGrade").textContent = highestGrade || "-";
  document.getElementById("weekHard").textContent = hardSessions;
  document.getElementById("weekBoulders").textContent = bouldersLogged;
  document.getElementById("weekBeta7").textContent = beta7Routes;

  renderCompliance(weekSessions);
  renderReadiness(weekSessions, previousWeekLoad, weekLoad);
  renderDeloadNotice();
}

function hasBoulder(session) {
  const b = session.boulder || {};
  return Boolean(b.url || b.routeId || b.gym || b.routeNumber || b.grade);
}

function renderCompliance(weekSessions) {
  const climbing = weekSessions.filter((s) => s.type.includes("Climbing")).length;
  const strength = weekSessions.filter((s) => s.type.includes("Strength")).length;
  const cardio = weekSessions.filter((s) => s.type.includes("Cycling") || s.type.includes("Walk") || s.type.includes("Run")).length;
  const rest = weekSessions.filter((s) => s.type === "Rest").length;

  setCompliance("climbCompliance", "climbBar", climbing, 3);
  setCompliance("strengthCompliance", "strengthBar", strength, 2);
  setCompliance("cardioCompliance", "cardioBar", cardio, 2);
  setCompliance("restCompliance", "restBar", rest, 1);
}

function setCompliance(textId, barId, actual, target) {
  const capped = Math.min(actual, target);
  const percent = Math.min((actual / target) * 100, 100);

  document.getElementById(textId).textContent = `${capped} / ${target}`;
  document.getElementById(barId).style.width = `${percent}%`;
}

function renderReadiness(weekSessions, previousWeekLoad, currentWeekLoad) {
  const box = document.getElementById("readinessBox");
  const status = document.getElementById("readinessStatus");
  const reason = document.getElementById("readinessReason");

  box.classList.remove("green", "yellow", "red", "neutral");

  if (sessions.length === 0) {
    box.classList.add("neutral");
    status.textContent = "No data yet";
    reason.textContent = "Add a session to calculate readiness.";
    return;
  }

  const latest = getLatestSession();
  const hardSessions = weekSessions.filter((s) => Number(s.rpe) >= 7).length;
  const loadIncreaseTooHigh = previousWeekLoad > 0 && currentWeekLoad > previousWeekLoad * 1.2;

  const redReasons = [];
  const yellowReasons = [];

  if (latest.pain >= 5) redReasons.push("latest pain level is 5 or higher");
  if (latest.fingerPain) redReasons.push("finger pain reported");
  if (latest.shoulderPain) redReasons.push("shoulder pain reported");
  if (latest.sleep === "Poor" && latest.rpe >= 7) redReasons.push("poor sleep plus hard last session");

  if (latest.pain >= 3 && latest.pain <= 4) yellowReasons.push("pain level is 3–4");
  if (hardSessions >= 3) yellowReasons.push("3 or more hard sessions this week");
  if (loadIncreaseTooHigh) yellowReasons.push("weekly load increased more than 20%");
  if (latest.energy === "Low" && latest.rpe >= 6) yellowReasons.push("low energy with moderate/hard training");

  if (redReasons.length > 0) {
    box.classList.add("red");
    status.textContent = "Red — Rest";
    reason.textContent = `Reason: ${redReasons.join(", ")}.`;
    return;
  }

  if (yellowReasons.length > 0) {
    box.classList.add("yellow");
    status.textContent = "Yellow — Reduce Volume";
    reason.textContent = `Reason: ${yellowReasons.join(", ")}.`;
    return;
  }

  box.classList.add("green");
  status.textContent = "Green — Train Normally";
  reason.textContent = "Pain is low, no major warning signs, and load increase is acceptable.";
}

function renderDeloadNotice() {
  const box = document.getElementById("deloadBox");
  const trainingWeek = getTrainingWeekNumber();

  if (trainingWeek > 0 && trainingWeek % 5 === 0) {
    box.classList.remove("hidden");
  } else {
    box.classList.add("hidden");
  }
}

function renderHistory() {
  const history = document.getElementById("history");
  history.innerHTML = "";

  if (sessions.length === 0) {
    history.innerHTML = `<p class="muted">No sessions saved yet.</p>`;
    return;
  }

  [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((session) => {
    const b = session.boulder || {};
    const div = document.createElement("div");
    div.className = "history-item";

    const gradeText = session.grade ? `Grade: ${session.grade}` : "No grade";
    const problemsText = session.problems ? ` · Problems: ${session.problems}` : "";
    const distanceText = session.distance ? ` · Distance: ${session.distance} km` : "";
    const notesText = session.notes ? `<p>${escapeHtml(session.notes)}</p>` : "";

    const boulderHtml = hasBoulder(session)
      ? `
        <div class="history-boulder">
          <strong>Boulder ${escapeHtml(b.routeNumber || b.routeId || "")}</strong>
          <div>${escapeHtml(b.gym || "")}${b.sector ? " · " + escapeHtml(b.sector) : ""}</div>
          <div>${escapeHtml(b.grade || "")}${b.circuit ? " · " + escapeHtml(b.circuit) : ""}</div>
          <div>Attempts: ${b.attempts || 0} · Sent: ${b.sent ? "Yes" : "No"} · Flash: ${b.flashed ? "Yes" : "No"}</div>
          ${b.url ? `<div><a href="${escapeHtml(b.url)}" target="_blank" rel="noopener">Open BETA7 route</a></div>` : ""}
        </div>
      `
      : "";

    div.innerHTML = `
      <div class="history-item-top">
        <div>
          <h4>${escapeHtml(session.type)}</h4>
          <small>${session.date}</small>
        </div>
        <button class="delete-btn" data-id="${session.id}">Delete</button>
      </div>

      <p>
        ${gradeText} · ${session.duration || 0} min · RPE ${session.rpe} · Load ${session.trainingLoad || 0}
        ${problemsText}${distanceText}
      </p>

      <p>
        Pain ${session.pain || 0}/10 · Sleep: ${session.sleep || "OK"} · Energy: ${session.energy || "Normal"}
      </p>

      ${boulderHtml}
      ${notesText}
    `;

    div.querySelector(".delete-btn").addEventListener("click", () => deleteSession(session.id));
    history.appendChild(div);
  });
}

function renderGradeChart() {
  const canvas = document.getElementById("gradeChart");
  if (!canvas) return;

  const climbingSessions = sessions
    .filter((s) => s.grade && gradeMap[s.grade] !== undefined)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = climbingSessions.map((s) => s.date);
  const data = climbingSessions.map((s) => gradeMap[s.grade]);

  const ctx = canvas.getContext("2d");
  if (gradeChart) gradeChart.destroy();

  gradeChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "Max Grade", data, tension: 0.25 }] },
    options: {
      responsive: true,
      scales: { y: { min: 0, max: 3, ticks: { stepSize: 1, callback: (value) => `V${value}` } } },
      plugins: { legend: { display: false } }
    }
  });
}

function renderMinutesChart() {
  const canvas = document.getElementById("minutesChart");
  if (!canvas) return;

  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sorted.map((s) => s.date);
  const data = sorted.map((s) => Number(s.duration || 0));

  const ctx = canvas.getContext("2d");
  if (minutesChart) minutesChart.destroy();

  minutesChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Minutes", data }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function renderLoadChart() {
  const canvas = document.getElementById("loadChart");
  if (!canvas) return;

  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sorted.map((s) => s.date);
  const data = sorted.map((s) => Number(s.trainingLoad || 0));

  const ctx = canvas.getContext("2d");
  if (loadChart) loadChart.destroy();

  loadChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Training Load", data }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function getCurrentWeekSessions() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);

  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return sessions.filter((s) => {
    const d = new Date(`${s.date}T00:00:00`);
    return d >= start && d < end;
  });
}

function getPreviousWeekSessions() {
  const now = new Date();
  const currentStart = new Date(now);
  const day = currentStart.getDay();
  const diff = currentStart.getDate() - day + (day === 0 ? -6 : 1);

  currentStart.setDate(diff);
  currentStart.setHours(0, 0, 0, 0);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 7);

  return sessions.filter((s) => {
    const d = new Date(`${s.date}T00:00:00`);
    return d >= previousStart && d < currentStart;
  });
}

function getLatestSession() {
  return [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

function getHighestGrade(list) {
  const grades = list
    .filter((s) => s.grade && gradeMap[s.grade] !== undefined)
    .map((s) => gradeMap[s.grade]);

  if (grades.length === 0) return "";

  return gradeReverseMap[Math.max(...grades)];
}

function getTrainingWeekNumber() {
  if (sessions.length === 0) return 0;

  const first = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const firstDate = new Date(`${first.date}T00:00:00`);
  const now = new Date();

  const diffDays = Math.floor((now - firstDate) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

function sum(list, key) {
  return list.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function round(value, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}
