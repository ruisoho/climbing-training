const STORAGE_KEY = "trainingSessionsV1";

let sessions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let gradeChart = null;
let minutesChart = null;

const gradeMap = {
  V0: 0,
  V1: 1,
  V2: 2,
  V3: 3
};

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupButtons();
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

  if (tabId === "tracker") {
    renderAll();
  }
}

function setupButtons() {
  document.getElementById("saveBtn").addEventListener("click", addSession);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("clearBtn").addEventListener("click", clearData);
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
  const rpe = document.getElementById("rpe").value;
  const notes = document.getElementById("notes").value.trim();

  if (!date) {
    alert("Add a date.");
    return;
  }

  if (duration <= 0 && type !== "Rest") {
    alert("Add duration in minutes.");
    return;
  }

  const session = {
    id: Date.now(),
    date,
    type,
    grade,
    duration,
    problems,
    distance,
    rpe,
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
  document.getElementById("rpe").value = "Easy";
  document.getElementById("notes").value = "";

  setToday();
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
  link.download = "training-sessions.json";
  link.click();

  URL.revokeObjectURL(url);
}

function renderAll() {
  renderSummary();
  renderHistory();
  renderGradeChart();
  renderMinutesChart();
}

function renderSummary() {
  const totalSessions = sessions.length;

  const totalMinutes = sessions.reduce((sum, session) => {
    return sum + Number(session.duration || 0);
  }, 0);

  const climbSessions = sessions.filter((session) => {
    return session.type.includes("Climbing");
  }).length;

  const cardioSessions = sessions.filter((session) => {
    return (
      session.type.includes("Cycling") ||
      session.type.includes("Walk") ||
      session.type.includes("Run")
    );
  }).length;

  document.getElementById("totalSessions").textContent = totalSessions;
  document.getElementById("totalMinutes").textContent = totalMinutes;
  document.getElementById("climbSessions").textContent = climbSessions;
  document.getElementById("cardioSessions").textContent = cardioSessions;

  const weekSessions = getCurrentWeekSessions();
  const trainingCount = weekSessions.filter((session) => session.type !== "Rest").length;
  const percent = Math.min((trainingCount / 6) * 100, 100);

  document.getElementById("weeklyBar").style.width = `${percent}%`;
  document.getElementById("weeklyText").textContent =
    `${trainingCount} of 6 weekly training sessions completed.`;
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
        ${gradeText} · ${session.duration || 0} min${problemsText}${distanceText} · ${session.rpe}
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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
