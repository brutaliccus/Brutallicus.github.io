document.addEventListener('DOMContentLoaded', () => {
  // Exercise Management
  const newExerciseTitleInput = document.getElementById('new-exercise-title');
  const newExerciseCategorySelect = document.getElementById('new-exercise-category');
  const addExerciseButton = document.getElementById('add-exercise');
  const exerciseSelect = document.getElementById('exercise');
  const pushingGroup = document.getElementById('pushing-group');
  const pullingGroup = document.getElementById('pulling-group');
  const legsGroup = document.getElementById('legs-group');
  const otherGroup = document.getElementById('other-group');

  // CSV Import Elements
  const importExercisesButton = document.getElementById('import-exercises-button');
  const exerciseCsvUpload = document.getElementById('exercise-csv-upload');

  // Workout Entry
  const dateInput = document.getElementById('date');
  const weightInput = document.getElementById('weight');
  const repsInput = document.getElementById('reps');
  const setsInput = document.getElementById('sets');
  const addWorkoutButton = document.getElementById('add-workout');

  // Macro Entry
  const macroDateInput = document.getElementById('macro-date');
  const fatInput = document.getElementById('fat');
  const proteinInput = document.getElementById('protein');
  const carbsInput = document.getElementById('carbs');
  const addMacrosButton = document.getElementById('add-macros');
  const totalFatSpan = document.getElementById('total-fat');
  const totalProteinSpan = document.getElementById('total-protein');
  const totalCarbsSpan = document.getElementById('total-carbs');
  const totalCaloriesSpan = document.getElementById('total-calories');

  // Workout Log
  const logDateSelect = document.getElementById('log-date-select');
  const workoutList = document.getElementById('workout-list');

  // PRs
  const prCategorySelect = document.getElementById('pr-category-select');
  const prExerciseList = document.getElementById('pr-exercise-list');

  // Exercise Weight Chart
  const exerciseSelectChart = document.getElementById('exercise-select-chart');
  const weightOverTimeChartCanvas = document.getElementById('weight-over-time-chart').getContext('2d');
  let weightOverTimeChart;

  // Charts
  const calorieChartCanvas = document.getElementById('calorie-chart').getContext('2d');
  const proteinChartCanvas = document.getElementById('protein-chart').getContext('2d');
  let calorieChart, proteinChart;

  // Data Initialization from localStorage
  let exercises = JSON.parse(localStorage.getItem('exercises')) || {
    Push: ["Bench Press", "Overhead Press", "Dips"],
    Pull: ["Pull-ups", "Rows", "Lat Pulldowns"],
    Legs: ["Squats", "Deadlifts", "Leg Press"],
    Other: []
  };

  let workouts = JSON.parse(localStorage.getItem('workouts')) || [];
  let dailyMacros = JSON.parse(localStorage.getItem('dailyMacros')) || {};

  // Initialize date to today
  const today = new Date();
  dateInput.valueAsDate = today;
  macroDateInput.valueAsDate = today;
  logDateSelect.valueAsDate = today;

  // --- Tab Functionality ---
  window.openTab = function(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    if (tabName === 'Charts') {
      updateCharts();
    }
  }

    // Set the default tab
  document.getElementById("Log").style.display = "block";
  document.getElementsByClassName("tablinks")[0].className += " active";

  // --- Exercise Management ---
  function populateExerciseSelect() {
      //Clear existing options for adding a workout
      pushingGroup.innerHTML = "";
      pullingGroup.innerHTML = "";
      legsGroup.innerHTML = "";
      otherGroup.innerHTML = "";

      let allExercises = []; //for populating exercise weight chart

      //Populate with exercises from local storage
      Object.keys(exercises).forEach(category => {
          exercises[category].forEach(exercise => {
              const option = document.createElement('option');
              option.value = exercise;
              option.textContent = exercise;

              allExercises.push(exercise); //add the exercise to allExercises

              if (category === "Push") {
                  pushingGroup.appendChild(option);
              } else if (category === "Pull") {
                  pullingGroup.appendChild(option);
              } else if (category === "Legs") {
                  legsGroup.appendChild(option);
              } else if (category === "Other") {
                  otherGroup.appendChild(option);
              }
          });
      });

      //Also fill in the exercise weight chart selection
      exerciseSelectChart.innerHTML = ""; //clear existing exercises

      allExercises.forEach(exercise => {
          const option = document.createElement('option');
          option.value = exercise;
          option.textContent = exercise;
          exerciseSelectChart.appendChild(option);
      });
  }

    // Function to parse CSV content
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase()); // Standardize casing for safety

        if (!headers.includes('exercise') || !headers.includes('category')) {
            alert('CSV must have "Exercise" and "Category" headers.');
            return [];
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            const entry = {};
            for (let j = 0; j < headers.length; j++) {
                entry[headers[j]] = values[j];
            }
            data.push(entry);
        }
        return data;
    }

    // Main CSV import function
    importExercisesButton.addEventListener('click', () => {
        exerciseCsvUpload.click(); // Trigger the hidden file input
    });

  exerciseCsvUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const csvText = e.target.result;
                const parsedData = parseCSV(csvText);

                if (parsedData.length > 0) {
                    let newExercises = { Push: [], Pull: [], Legs: [], Other: [] };

                    parsedData.forEach(item => {
                        const exerciseName = item.exercise;
                        const category = item.category;

                        // Ensure that the category is valid
                        if (["Push", "Pull", "Legs", "Other"].includes(category)) {
                            newExercises[category].push(exerciseName);
                        } else {
                            console.warn(`Invalid category "${category}" found for exercise "${exerciseName}". Skipping.`);
                        }
                    });

                    // Add new exercises to existing exercises, avoiding duplicates
                    Object.keys(newExercises).forEach(category => {
                        exercises[category] = [...new Set([...exercises[category], ...newExercises[category]])];
                    });

                    localStorage.setItem('exercises', JSON.stringify(exercises));
                    populateExerciseSelect();

                    alert('Exercises imported successfully!');
                }
            };

            reader.onerror = function () {
                alert('Error reading the CSV file.');
            };

            reader.readAsText(file);
        }
    });

  addExerciseButton.addEventListener('click', () => {
      const title = newExerciseTitleInput.value.trim();
      const category = newExerciseCategorySelect.value;

      if (title && category && exercises.hasOwnProperty(category)) {
          exercises[category].push(title);
          exercises[category] = [...new Set(exercises[category])]; //remove duplicates

          localStorage.setItem('exercises', JSON.stringify(exercises));
          populateExerciseSelect();

          newExerciseTitleInput.value = ''; //clear the input field
      } else {
          alert('Please enter an exercise title and select a category.');
      }
  });

  // --- Workout Entry ---
  addWorkoutButton.addEventListener('click', () => {
    const date = dateInput.value;
    const exercise = exerciseSelect.value;
    const weight = parseInt(weightInput.value);
    const reps = parseInt(repsInput.value);
    const sets = parseInt(setsInput.value);

    if (date && exercise && weight && reps && sets) {
      workouts.push({ date, exercise, weight, reps, sets });
      localStorage.setItem('workouts', JSON.stringify(workouts));
      displayWorkouts(logDateSelect.value);
      updatePRs();
      updateWeightOverTimeChart(exerciseSelectChart.value);

      // Clear input fields
      weightInput.value = '';
      repsInput.value = '';
      setsInput.value = '';
    } else {
      alert('Please fill in all workout fields.');
    }
  });

  // --- Macro Entry ---
  function updateMacrosDisplay(date) {
    let totalFat = 0, totalProtein = 0, totalCarbs = 0;

    if (dailyMacros[date]) {
        totalFat = dailyMacros[date].fat || 0;
        totalProtein = dailyMacros[date].protein || 0;
        totalCarbs = dailyMacros[date].carbs || 0;
    }

    totalFatSpan.textContent = totalFat;
    totalProteinSpan.textContent = totalProtein;
    totalCarbsSpan.textContent = totalCarbs;
    const calories = (totalFat * 9) + (totalProtein * 4) + (carbs * 4);
    totalCaloriesSpan.textContent = calories;
  }

  addMacrosButton.addEventListener('click', () => {
    const date = macroDateInput.value;
    const fat = parseInt(fatInput.value) || 0;
    const protein = parseInt(proteinInput.value) || 0;
    const carbs = parseInt(carbsInput.value) || 0;

    if (!dailyMacros[date]) {
        dailyMacros[date] = {fat: 0, protein: 0, carbs: 0};
    }

    dailyMacros[date].fat = (dailyMacros[date].fat || 0) + fat;
    dailyMacros[date].protein = (dailyMacros[date].protein || 0) + protein;
    dailyMacros[date].carbs = (dailyMacros[date].carbs || 0) + carbs;

    localStorage.setItem('dailyMacros', JSON.stringify(dailyMacros));
    updateMacrosDisplay(date);

    // Clear input fields
    fatInput.value = '';
    proteinInput.value = '';
    carbsInput.value = '';
  });

  // --- Workout Log ---
  function displayWorkouts(date) {
    workoutList.innerHTML = '';
    const filteredWorkouts = workouts.filter(workout => workout.date === date);

    filteredWorkouts.forEach((workout) => {
      const li = document.createElement('li');
      li.textContent = `${workout.exercise}: ${workout.weight} lbs x ${workout.reps} reps x ${workout.sets} sets`;

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        const index = workouts.findIndex(w => w.date === workout.date && w.exercise === workout.exercise && w.weight === workout.weight && w.reps === workout.reps && w.sets === workout.sets);
        if (index > -1) {
          workouts.splice(index, 1);
          localStorage.setItem('workouts', JSON.stringify(workouts));
          displayWorkouts(date);
          updatePRs();
        }
      });

      li.appendChild(deleteButton);
      workoutList.appendChild(li);
    });
  }

  logDateSelect.addEventListener('change', () => {
      displayWorkouts(logDateSelect.value);
  });

  // --- PRs ---
  function updatePRs(category = prCategorySelect.value) {
    prExerciseList.innerHTML = "";  // Clear the previous list

    const filteredExercises = exercises[category];
    if (!filteredExercises) return; // Exit if there are no exercises in the category

    // Filter workouts to only include those in the selected category
    const categoryWorkouts = workouts.filter(workout => filteredExercises.includes(workout.exercise));

    filteredExercises.forEach(exercise => {
      if (categoryWorkouts.some(workout => workout.exercise === exercise)) { //has the workout been entered at least once?
        const exerciseDiv = document.createElement('div');
        exerciseDiv.innerHTML = `<h4>${exercise}</h4>`;

        // Find highest weight for the exercise
        let highestWeight = 0;
        let highestWeightDetails = '';
        categoryWorkouts.filter(workout => workout.exercise === exercise).forEach(workout => {
          if (workout.weight > highestWeight) {
            highestWeight = workout.weight;
            highestWeightDetails = `Weight: ${workout.weight}, Reps: ${workout.reps}, Sets: ${workout.sets}`;
          }
        });

        // Find highest reps for the exercise
        let highestReps = 0;
        let highestRepsDetails = '';

        categoryWorkouts.filter(workout => workout.exercise === exercise).forEach(workout => {
          if (workout.reps > highestReps) {
            highestReps = workout.reps;
            highestRepsDetails = `Reps: ${workout.reps}, Weight: ${workout.weight}, Sets: ${workout.sets}`;
          }
        });

        exerciseDiv.innerHTML += `<p>Highest Weight: ${highestWeight > 0 ? highestWeight : 'N/A'} ${highestWeightDetails ? `(${highestWeightDetails})` : ''}</p>`;
        exerciseDiv.innerHTML += `<p>Highest Reps: ${highestReps > 0 ? highestReps : 'N/A'} ${highestRepsDetails ? `(${highestRepsDetails})` : ''}</p>`;
        prExerciseList.appendChild(exerciseDiv);
      }
    });
  }

  prCategorySelect.addEventListener('change', () => {
      updatePRs(); // Reload PRs when category selection changes
  });

  // --- Charts ---
  function updateCharts() {
    const dates = Object.keys(dailyMacros);
    const calorieData = dates.map(date => {
        const fat = dailyMacros[date].fat || 0;
        const protein = dailyMacros[date].protein || 0;
        const carbs = dailyMacros[date].carbs || 0;
        return (fat * 9) + (protein * 4) + (carbs * 4);
    });

    const proteinData = dates.map(date => dailyMacros[date].protein || 0);

    if (calorieChart) {
      calorieChart.destroy();
    }
    if (proteinChart) {
      proteinChart.destroy();
    }

    calorieChart = new Chart(calorieChartCanvas, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Daily Calories',
          data: calorieData,
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    proteinChart = new Chart(proteinChartCanvas, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Daily Protein Intake (g)',
          data: proteinData,
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function updateWeightOverTimeChart(exercise) {
      const exerciseData = workouts.filter(workout => workout.exercise === exercise);

      const labels = exerciseData.map(workout => workout.date);
      const weightData = exerciseData.map(workout => workout.weight);

      if (weightOverTimeChart) {
          weightOverTimeChart.destroy();
      }

      weightOverTimeChart = new Chart(weightOverTimeChartCanvas, {
          type: 'line',
          data: {
              labels: labels,
              datasets: [{
                  label: `Weight Used for ${exercise} Over Time`,
                  data: weightData,
                  borderColor: 'rgba(54, 162, 235, 1)',
                  borderWidth: 1
              }]
          },
          options: {
              scales: {
                  y: {
                      beginAtZero: true,
                      title: {
                          display: true,
                          text: 'Weight (lbs)'
                      }
                  },
                  x: {
                      title: {
                          display: true,
                          text: 'Date'
                      }
                  }
              }
          }
      });
  }

  // --- Initialization ---
  populateExerciseSelect();
  updatePRs();
  updateMacrosDisplay(macroDateInput.value);

      window.openTab(null, 'Log');
   if (localStorage.getItem('workouts')) {
    workouts = JSON.parse(localStorage.getItem('workouts'));

  loadCheckFunction()
  }
                function loadCheckFunction() {
                                }
});

// PWA Service Worker registration (Simplified)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}
