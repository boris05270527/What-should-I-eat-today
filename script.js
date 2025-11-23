const RACE_DISTANCE = 300; // how far they must run
const ESTIMATED_RACE_DURATION_MS = 12000; // ~12s race (tweakable)

// Each speed phase lasts between 1/20 and 1/10 of the race
const MIN_PHASE_MS = ESTIMATED_RACE_DURATION_MS / 20; // ~600 ms
const MAX_PHASE_MS = ESTIMATED_RACE_DURATION_MS / 10; // ~1200 ms;

function randomPhaseDuration() {
  return MIN_PHASE_MS + Math.random() * (MAX_PHASE_MS - MIN_PHASE_MS);
}

// Random speed for this horse, in "distance units per second"
function randomSpeedFor(horse) {
  const baseMin = 10; // slowest
  const baseMax = 50; // fastest (before weight)
  const minSpeed = baseMin;
  const maxSpeed = baseMax * horse.weight; // favorites can go faster
  return minSpeed + Math.random() * (maxSpeed - minSpeed);
}

// Basic palette for horse colors
const COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#ec4899",
  "#2dd4bf",
  "#a855f7",
  "#f97373",
];

const defaultRestaurants = [
  { name: "Pizza Place", weight: 1.0 },
  { name: "Sushi Bar", weight: 1.2 },
  { name: "Burger Joint", weight: 1.0 },
  { name: "Ramen House", weight: 1.3 },
];

let restaurants = [];
let raceRunning = false;
let winner = null;

const nameInput = document.getElementById("name-input");
const weightSelect = document.getElementById("weight-select");
const addBtn = document.getElementById("add-btn");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const restaurantList = document.getElementById("restaurant-list");
const lanesContainer = document.getElementById("lanes");
const raceStatus = document.getElementById("race-status");
const winnerBanner = document.getElementById("winner-banner");
const winnerText = document.getElementById("winner-text");

function badgeClass(weight) {
  if (weight >= 1.4) return "badge badge-strong";
  if (weight >= 1.1) return "badge badge-medium";
  return "badge badge-light";
}

function badgeLabel(weight) {
  if (weight >= 1.4) return "Craving";
  if (weight >= 1.1) return "Fav";
  return "Neutral";
}

function renderRestaurantList() {
  restaurantList.innerHTML = "";
  if (restaurants.length === 0) {
    restaurantList.innerHTML =
      '<div class="restaurant-row" style="justify-content:center;color:#6b7280;">No restaurants yet</div>';
    return;
  }
  restaurants.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "restaurant-row";
    row.innerHTML = `
          <div class="restaurant-main">
            <span style="opacity:0.6;font-size:11px;">#${idx + 1}</span>
            <span>${r.name}</span>
            <span class="${badgeClass(r.weight)}">${badgeLabel(r.weight)}</span>
          </div>
          <button class="remove-btn" title="Remove">&times;</button>
        `;
    row.querySelector(".remove-btn").addEventListener("click", () => {
      restaurants.splice(idx, 1);
      renderRestaurantList();
      buildTrack();
    });
    restaurantList.appendChild(row);
  });
}

function addRestaurant(name, weightVal) {
  if (!name.trim()) return;
  const color = COLORS[restaurants.length % COLORS.length];
  restaurants.push({
    id: Date.now() + "_" + Math.random().toString(16).slice(2),
    name: name.trim(),
    weight: parseFloat(weightVal),
    color,
    progress: 0,
    speed: 0,
    phaseRemainingMs: 0,
  });
  renderRestaurantList();
  buildTrack();
}

function buildTrack() {
  lanesContainer.innerHTML = "";
  restaurants.forEach((r, idx) => {
    const lane = document.createElement("div");
    lane.className = "lane";
    const horse = document.createElement("div");
    horse.className = "horse";
    horse.dataset.id = r.id;
    horse.style.background = r.color;
    horse.innerHTML = `
          <span class="horse-emoji">🐎</span>
          <span>${r.name}</span>
        `;
    lane.appendChild(horse);
    lanesContainer.appendChild(lane);
  });
}

function updateHorsePositions() {
  restaurants.forEach((r) => {
    const horseEl = lanesContainer.querySelector(`.horse[data-id="${r.id}"]`);
    if (!horseEl) return;

    const pct = Math.min((r.progress / RACE_DISTANCE) * 100, 100);
    horseEl.style.left = pct + "%";
  });
}

function resetRaceState() {
  raceRunning = false;
  winner = null;
  restaurants.forEach((r) => {
    r.progress = 0;
    r.speed = 0;
    r.phaseRemainingMs = 0;
  });
  updateHorsePositions();
  raceStatus.textContent = "Waiting to start";
  raceStatus.classList.remove("running", "finished");
  winnerBanner.style.display = "none";
}

function startRace() {
  if (raceRunning) return;
  if (restaurants.length < 2) {
    alert("Add at least 2 restaurants first.");
    return;
  }

  resetRaceState();
  raceRunning = true;
  raceStatus.textContent = "Race in progress…";
  raceStatus.classList.add("running");

  // Initialize distance, speed, and phase time for each horse
  restaurants.forEach((r) => {
    r.progress = 0;
    r.speed = randomSpeedFor(r); // units per second
    r.phaseRemainingMs = randomPhaseDuration();
  });

  let lastTime = null;

  function step(timestamp) {
    if (!raceRunning) return;

    if (lastTime == null) lastTime = timestamp;
    const deltaMs = timestamp - lastTime;
    lastTime = timestamp;

    let anyFinished = false;

    restaurants.forEach((r) => {
      if (winner) return;

      // Decrease remaining time in this speed phase
      r.phaseRemainingMs -= deltaMs;

      // If phase ended, pick a new speed and new phase length
      if (r.phaseRemainingMs <= 0) {
        r.speed = randomSpeedFor(r);
        r.phaseRemainingMs = randomPhaseDuration();
      }

      // Move: speed (units/sec) * time (sec)
      const deltaSec = deltaMs / 1000;
      r.progress += r.speed * deltaSec;

      if (r.progress >= RACE_DISTANCE && !winner) {
        r.progress = RACE_DISTANCE;
        winner = r;
        anyFinished = true;
      }
    });

    updateHorsePositions();

    if (anyFinished && winner) {
      raceRunning = false;
      raceStatus.textContent = "Race finished";
      raceStatus.classList.remove("running");
      raceStatus.classList.add("finished");
      winnerBanner.style.display = "block";
      winnerText.innerHTML = `Today's winner is <strong>🐎 ${winner.name}</strong>. Maybe that's your dinner.`;
      return;
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// Event wiring
addBtn.addEventListener("click", () => {
  addRestaurant(nameInput.value, weightSelect.value);
  nameInput.value = "";
  nameInput.focus();
});

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addRestaurant(nameInput.value, weightSelect.value);
    nameInput.value = "";
  }
});

startBtn.addEventListener("click", startRace);

resetBtn.addEventListener("click", () => {
  restaurants = [];
  renderRestaurantList();
  buildTrack();
  resetRaceState();
});

// Initial defaults
defaultRestaurants.forEach((r) => addRestaurant(r.name, r.weight));
resetRaceState();
