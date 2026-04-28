const STORAGE_KEY = "trainingSessionsV2";

let sessions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let gradeChart = null;
let minutesChart = null;
let loadChart = null;

const gradeMap = {
  V0: 0,
  V1: 1,
  V2: 2,
  V3: 3
};

const gradeReverseMap = {
  0: "V0",
  1: "V1",
  2: "V2",
  3: "V3"
};

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupButtons();
  setupLiveLoadPreview();
  setToday();
  renderAll();
});

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tab;
      showTab(tabId, button);
    });
  });
}

function showTab(tabId, activeButton) {
  document.querySelectorAll(".tab-section").forEach((section) => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.remove("active");
  });

  document.getElementById(tabId).classList.add("active");
  activeButton.classList.add("active");

  renderAll();
}

function setupButtons() {
  document.getElementById("saveBtn").addEventListener("click", addSession);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("clearBtn").addEventListener("click", clearData);
  document.getElementById("importFile").addEventListener("change", importData);
}

function setupLiveLoadPreview() {
  const durationInput = document.getElementById("duration");
  const rpeInput = document.getElementById("rpe");

  durationInput.addEventListener("input", updateLoadPreview);
  rpeInput.addEventListener("change", updateLoadPreview);

  updateLoadPreview();
}

function updateLoadPreview() {
  const duration = Number(document.getElementById("duration").value || 0);
  const rpe = Number(document.getElementById("rpe").value || 0);
  const load = duration * rpe;

  document.getElementById("loadPreview").textContent = load;
}

function setToday() {
  const dateInput = document.getElementById("date");

  if (dateInput) {
    dateInput.valueAsDate = new Date();
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

  if (rpe < 1 || rpe > 10) {
    alert("RPE must be between 1 and 10.");
    return;
  }

  if (pain < 0 || pain > 10) {
    alert("Pain must be between 0 and 10.");
    return;
  }

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
  const confirmed = confirm("Delete all saved training data?");

  if (!confirmed) return;

  sessions = [];
  saveData();
  renderAll();
}

function exportData() {
  const data = JSON.stringify(sessions, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "training-sessions-backup.json";
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

      const normalized = imported.map((session) => normalizeImportedSession(session));

      sessions = normalized;
      saveData();
      renderAll();

      alert("Data imported.");
    } catch (error) {
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

  const painSessions = weekSessions.filter((session) => Number.isFinite(Number(session.pain)));
  const painAverage = painSessions.length
    ? round(sum(painSessions, "pain") / painSessions.length, 1)
    : 0;

  const highestGrade = getHighestGrade(weekSessions);
  const hardSessions = weekSessions.filter((session) => Number(session.rpe) >= 7).length;

  document.getElementById("weekSessions").textContent = weekSessions.length;
  document.getElementById("weekMinutes").textContent = weekMinutes;
  document.getElementById("weekLoad").textContent = weekLoad;
  document.getElementById("weekPain").textContent = painAverage;
  document.getElementById("weekGrade").textContent = highestGrade || "-";
  document.getElementById("weekHard").textContent = hardSessions;

  renderCompliance(weekSessions);
  renderReadiness(weekSessions, previousWeekLoad, weekLoad);
  renderDeloadNotice();
}

function renderCompliance(weekSessions) {
  const climbing = weekSessions.filter((session) => session.type.includes("Climbing")).length;
  const strength = weekSessions.filter((session) => session.type.includes("Strength")).length;
  const cardio = weekSessions.filter((session) => {
    return (
      session.type.includes("Cycling") ||
      session.type.includes("Walk") ||
      session.type.includes("Run")
    );
  }).length;
  const rest = weekSessions.filter((session) => session.type === "Rest").length;

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
  const hardSessions = weekSessions.filter((session) => Number(session.rpe) >= 7).length;
  const loadIncreaseTooHigh =
    previousWeekLoad > 0 && currentWeekLoad > previousWeekLoad * 1.2;

  const redReasons = [];
  const yellowReasons = [];

  if (latest.pain >= 5) redReasons.push("latest pain level is 5 or higher");
  if (latest.fingerPain) redReasons.push("finger pain reported");
  if (latest.shoulderPain) redReasons.push("shoulder pain reported");
  if (latest.sleep === "Poor" && latest.rpe >= 7) {
    redReasons.push("poor sleep plus hard last session");
  }

  if (latest.pain >= 3 && latest.pain <= 4) yellowReasons.push("pain level is 3–4");
  if (hardSessions >= 3) yellowReasons.push("3 or more hard sessions this week");
  if (loadIncreaseTooHigh) yellowReasons.push("weekly load increased more than 20%");
  if (latest.energy === "Low" && latest.rpe >= 6) {
    yellowReasons.push("low energy with moderate/hard training");
  }

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

function getTrainingWeekNumber() {
  if (sessions.length === 0) return 0;

  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstDate = new Date(`${sorted[0].date}T00:00:00`);
  const now = new Date();

  const diffMs = now - firstDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.floor(diffDays / 7) + 1;
}

function renderHistory() {
  const history = document.getElementById("history");
  history.innerHTML = "";

  if (sessions.length === 0) {
    history.innerHTML = `<p class="muted">No sessions saved yet.</p>`;
    return;
  }

  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  sortedSessions.forEach((session) => {
    const div = document.createElement("div");
    div.className = "history-item";

    const gradeText = session.grade ? `Grade: ${session.grade}` : "No grade";
    const problemsText = session.problems ? ` · Problems: ${session.problems}` : "";
    const distanceText = session.distance ? ` · Distance: ${session.distance} km` : "";
    const painFlags = [
      session.fingerPain ? "Finger pain" : "",
      session.shoulderPain ? "Shoulder pain" : ""
    ].filter(Boolean);

    const painText = painFlags.length ? ` · ${painFlags.join(" · ")}` : "";
    const notesText = session.notes ? `<p>${escapeHtml(session.notes)}</p>` : "";

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
        Pain ${session.pain || 0}/10 · Sleep: ${session.sleep || "OK"} · Energy: ${session.energy || "Normal"}${painText}
      </p>

      ${notesText}
    `;

    const deleteButton = div.querySelector(".delete-btn");
    deleteButton.addEventListener("click", () => {
      deleteSession(session.id);
    });

    history.appendChild(div);
  });
}

function renderGradeChart() {
  const canvas = document.getElementById("gradeChart");
  if (!canvas) return;

  const climbingSessions = sessions
    .filter((session) => session.grade && gradeMap[session.grade] !== undefined)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = climbingSessions.map((session) => session.date);
  const data = climbingSessions.map((session) => gradeMap[session.grade]);

  const ctx = canvas.getContext("2d");

  if (gradeChart) {
    gradeChart.destroy();
  }

  gradeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Max Grade",
          data,
          tension: 0.25
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 3,
          ticks: {
            stepSize: 1,
            callback: (value) => `V${value}`
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function renderMinutesChart() {
  const canvas = document.getElementById("minutesChart");
  if (!canvas) return;

  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const labels = sortedSessions.map((session) => session.date);
  const data = sortedSessions.map((session) => Number(session.duration || 0));

  const ctx = canvas.getContext("2d");

  if (minutesChart) {
    minutesChart.destroy();
  }

  minutesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Minutes",
          data
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderLoadChart() {
  const canvas = document.getElementById("loadChart");
  if (!canvas) return;

  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const labels = sortedSessions.map((session) => session.date);
  const data = sortedSessions.map((session) => Number(session.trainingLoad || 0));

  const ctx = canvas.getContext("2d");

  if (loadChart) {
    loadChart.destroy();
  }

  loadChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Training Load",
          data
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
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

  return sessions.filter((session) => {
    const sessionDate = new Date(`${session.date}T00:00:00`);
    return sessionDate >= start && sessionDate < end;
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

  const previousEnd = new Date(currentStart);

  return sessions.filter((session) => {
    const sessionDate = new Date(`${session.date}T00:00:00`);
    return sessionDate >= previousStart && sessionDate < previousEnd;
  });
}

function getLatestSession() {
  return [...sessions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  })[0];
}

function getHighestGrade(sessionList) {
  const grades = sessionList
    .filter((session) => session.grade && gradeMap[session.grade] !== undefined)
    .map((session) => gradeMap[session.grade]);

  if (grades.length === 0) return "";

  const max = Math.max(...grades);
  return gradeReverseMap[max];
}

function sum(sessionList, key) {
  return sessionList.reduce((total, session) => {
    return total + Number(session[key] || 0);
  }, 0);
}

function round(value, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
