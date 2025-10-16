// === DOM Elements ===
const dateInput = document.getElementById("workoutDate");
const prevBtn = document.getElementById("prevWorkout");
const nextBtn = document.getElementById("nextWorkout");
const entriesContainer = document.getElementById("workoutEntries");
const form = document.getElementById("workoutForm");
const exerciseSelect = document.getElementById("exercise");
const setsInput = document.getElementById("sets");
const repsInput = document.getElementById("reps");
const weightInput = document.getElementById("weight");

// === Data ===
let workoutDates = []; // automatically built from localStorage

// === Initialization ===
window.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
  populateExercises();
  refreshWorkoutDates();
  updateWorkoutLog();
});

// === Populate exercise list ===
function populateExercises() {
  const defaultExercises = [
    "Bench Press",
    "Squat",
    "Deadlift",
    "Overhead Press",
    "Barbell Row",
    "Pull-Up",
  ];

  const savedExercises = JSON.parse(localStorage.getItem("exercises") || "[]");
  const allExercises = [...new Set([...defaultExercises, ...savedExercises])];

  exerciseSelect.innerHTML = allExercises
    .map((ex) => `<option value="${ex}">${ex}</option>`)
    .join("");
}

// === Add workout ===
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const exercise = exerciseSelect.value.trim();
  const sets = setsInput.value;
  const reps = repsInput.value;
  const weight = weightInput.value;
  const date = dateInput.value;

  if (!exercise || !sets || !reps || !weight) return;

  const workout = { exercise, sets, reps, weight };

  const workouts = JSON.parse(localStorage.getItem("workouts") || "{}");
  if (!workouts[date]) workouts[date] = [];
  workouts[date].push(workout);
  localStorage.setItem("workouts", JSON.stringify(workouts));

  refreshWorkoutDates();
  updateWorkoutLog();
  form.reset();
});

// === Display workouts for the selected date ===
function updateWorkoutLog() {
  const workouts = JSON.parse(localStorage.getItem("workouts") || "{}");
  const date = dateInput.value;
  const entries = workouts[date] || [];

  entriesContainer.innerHTML = entries
    .map(
      (w, i) => `
      <div class="workout-entry">
        <span>${w.exercise}</span>
        <span>${w.sets}x${w.reps}</span>
        <span>${w.weight} lbs</span>
        <div>
          <button class="edit-btn" onclick="editWorkout('${date}', ${i})">✎</button>
          <button class="delete-btn" onclick="deleteWorkout('${date}', ${i})">🗑</button>
        </div>
      </div>`
    )
    .join("");

  updateArrowStates();
}

// === Edit / Delete ===
function deleteWorkout(date, index) {
  const workouts = JSON.parse(localStorage.getItem("workouts") || "{}");
  workouts[date].splice(index, 1);
  localStorage.setItem("workouts", JSON.stringify(workouts));
  if (workouts[date].length === 0) delete workouts[date];
  localStorage.setItem("workouts", JSON.stringify(workouts));
  refreshWorkoutDates();
  updateWorkoutLog();
}

function editWorkout(date, index) {
  const workouts = JSON.parse(localStorage.getItem("workouts") || "{}");
  const item = workouts[date][index];
  exerciseSelect.value = item.exercise;
  setsInput.value = item.sets;
  repsInput.value = item.reps;
  weightInput.value = item.weight;
  deleteWorkout(date, index);
}

// === Navigation helpers ===
function refreshWorkoutDates() {
  const workouts = JSON.parse(localStorage.getItem("workouts") || "{}");
  workoutDates = Object.keys(workouts).sort();
}

function updateArrowStates() {
  if (workoutDates.length === 0) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  const cur = dateInput.value;
  const idx = workoutDates.indexOf(cur);
  if (idx === -1) {
    prevBtn.disabled = nextBtn.disabled = false;
  } else {
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= workoutDates.length - 1;
  }
}

function shiftToAvailable(direction) {
  if (workoutDates.length === 0) return;
  const cur = dateInput.value;
  let idx = workoutDates.indexOf(cur);
  if (idx === -1) {
    // not found, jump to nearest
    idx = direction > 0 ? 0 : workoutDates.length - 1;
  } else {
    idx += direction;
  }
  if (idx < 0 || idx >= workoutDates.length) return;
  dateInput.value = workoutDates[idx];
  updateWorkoutLog();
}

function shiftDate(days) {
  const cur = new Date(dateInput.value);
  cur.setDate(cur.getDate() + days);
  dateInput.value = cur.toISOString().split("T")[0];
  updateWorkoutLog();
}

// === Event listeners for arrows ===
prevBtn.addEventListener("click", () => {
  workoutDates.length > 0 ? shiftToAvailable(-1) : shiftDate(-1);
});
nextBtn.addEventListener("click", () => {
  workoutDates.length > 0 ? shiftToAvailable(1) : shiftDate(1);
});

// === Date change manually ===
dateInput.addEventListener("change", updateWorkoutLog);
