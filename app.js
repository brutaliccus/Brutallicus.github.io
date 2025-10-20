document.addEventListener('DOMContentLoaded', () => {

    // --- App State & Constants ---
    const CATEGORIES = ['Push', 'Pull', 'Legs', 'Other'];
    const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    let exercises = JSON.parse(localStorage.getItem('freilifts_exercises')) || [];
    let workouts = JSON.parse(localStorage.getItem('freilifts_workouts')) || [];
    let foodLogs = JSON.parse(localStorage.getItem('freilifts_foodLogs')) || {};
    let uniqueFoods = JSON.parse(localStorage.getItem('freilifts_uniqueFoods')) || [];
    let currentWorkoutIndex = -1;
    let currentFoodLogDate = null;
    let macroChart = null;

    // --- DOM Elements ---
    const themeSwitcher = document.getElementById('theme-switcher');
    const tabNav = document.getElementById('tab-nav');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Manage Exercises Elements
    const addExerciseForm = document.getElementById('add-exercise-form');
    const newExerciseNameInput = document.getElementById('new-exercise-name');
    const newExerciseCategorySelect = document.getElementById('new-exercise-category');
    const exerciseListContainer = document.getElementById('exercise-list-container');
    const csvFileInput = document.getElementById('csv-file-input');
    const importCsvBtn = document.getElementById('import-csv-btn');

    // Workout Log Elements
    const createWorkoutSection = document.getElementById('create-workout-section');
    const createWorkoutForm = document.getElementById('create-workout-form');
    const workoutDateInput = document.getElementById('workout-date');
    const workoutBodyweightInput = document.getElementById('workout-bodyweight');
    const workoutCategorySelect = document.getElementById('workout-category');
    const currentWorkoutSection = document.getElementById('current-workout-section');
    const workoutTitle = document.getElementById('workout-title');
    const prevWorkoutBtn = document.getElementById('prev-workout-btn');
    const nextWorkoutBtn = document.getElementById('next-workout-btn');
    const deleteWorkoutBtn = document.getElementById('delete-workout-btn');
    const addLogEntryForm = document.getElementById('add-log-entry-form');
    const searchExerciseInput = document.getElementById('search-exercise-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const logWeightInput = document.getElementById('log-weight');
    const logSetsInput = document.getElementById('log-sets');
    const logRepsInput = document.getElementById('log-reps');
    const workoutLogEntries = document.getElementById('workout-log-entries');
    const summaryCategorySelect = document.getElementById('summary-category-select');
    const workoutSummaryContent = document.getElementById('workout-summary-content');
    const finishWorkoutBtn = document.getElementById('finish-workout-btn');
    const editWorkoutBtn = document.getElementById('edit-workout-btn');
    const workoutControls = document.getElementById('workout-controls');
    
    // Food Log Elements
    const createFoodLogSection = document.getElementById('create-food-log-section');
    const createFoodLogForm = document.getElementById('create-food-log-form');
    const foodLogDateInput = document.getElementById('food-log-date');
    const currentFoodLogSection = document.getElementById('current-food-log-section');
    const foodLogTitle = document.getElementById('food-log-title');
    const prevFoodLogBtn = document.getElementById('prev-food-log-btn');
    const nextFoodLogBtn = document.getElementById('next-food-log-btn');
    const editFoodLogBtn = document.getElementById('edit-food-log-btn');
    const deleteFoodLogBtn = document.getElementById('delete-food-log-btn');
    const addFoodItemForm = document.getElementById('add-food-item-form');
    const foodItemNameInput = document.getElementById('food-item-name');
    const foodSearchResultsContainer = document.getElementById('food-search-results-container');
    const foodItemMealSelect = document.getElementById('food-item-meal');
    const foodItemFatInput = document.getElementById('food-item-fat');
    const foodItemCarbsInput = document.getElementById('food-item-carbs');
    const foodItemProteinInput = document.getElementById('food-item-protein');
    const foodLogEntries = document.getElementById('food-log-entries');
    const foodLogTotals = document.getElementById('food-log-totals');
    const finishFoodLogBtn = document.getElementById('finish-food-log-btn');


    // --- Functions ---
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const applyTheme = (themeName) => {
        document.body.className = '';
        document.body.classList.add(themeName);
        localStorage.setItem('freilifts_theme', themeName);
        const newThemeColor = getComputedStyle(document.body).getPropertyValue('--header-background');
        document.querySelector('meta[name="theme-color"]').setAttribute('content', newThemeColor.trim());
    };
    const loadTheme = () => {
        const savedTheme = localStorage.getItem('freilifts_theme') || 'theme-light';
        themeSwitcher.value = savedTheme;
        applyTheme(savedTheme);
    };
    const switchTab = (tabId) => {
        document.querySelectorAll('.tab-button').forEach(button => button.classList.toggle('active', button.dataset.tab === tabId));
        tabContents.forEach(content => content.classList.toggle('active', content.id === tabId));
        if (tabId === 'tab-workout-log') renderWorkoutLogView();
        if (tabId === 'tab-manage-exercises') renderExercises();
        if (tabId === 'tab-food-log') renderFoodLogView();
    };
    const saveExercises = () => localStorage.setItem('freilifts_exercises', JSON.stringify(exercises));
    const saveWorkouts = () => localStorage.setItem('freilifts_workouts', JSON.stringify(workouts));
    const saveFoodLogs = () => localStorage.setItem('freilifts_foodLogs', JSON.stringify(foodLogs));
    const saveUniqueFoods = () => localStorage.setItem('freilifts_uniqueFoods', JSON.stringify(uniqueFoods));
    const populateUniqueFoods = () => {
        const foodMap = new Map();
        uniqueFoods.forEach(food => foodMap.set(food.name.toLowerCase(), food));
        Object.values(foodLogs).forEach(log => {
            log.items.forEach(item => {
                if (!foodMap.has(item.name.toLowerCase())) {
                    foodMap.set(item.name.toLowerCase(), { name: item.name, fat: item.fat, carbs: item.carbs, protein: item.protein });
                }
            });
        });
        uniqueFoods = Array.from(foodMap.values());
        saveUniqueFoods();
    };

    // Manage Exercises Functions
    const renderExercises = () => {
        exerciseListContainer.innerHTML = '';
        if (exercises.length === 0) { exerciseListContainer.innerHTML = '<p>No exercises added yet.</p>'; return; }
        const grouped = exercises.reduce((acc, ex) => { (acc[ex.category] = acc[ex.category] || []).push(ex); return acc; }, {});
        CATEGORIES.forEach(cat => {
            if (grouped[cat]?.length > 0) {
                exerciseListContainer.innerHTML += `<h3>${cat}</h3>`;
                grouped[cat].forEach(ex => {
                    exerciseListContainer.innerHTML += `<div class="exercise-item" data-id="${ex.id}"><span>${ex.name}</span><div class="actions"><button class="icon-btn edit" title="Edit Exercise">&#9998;</button><button class="icon-btn delete" title="Delete Exercise">&#128465;</button></div></div>`;
                });
            }
        });
    };
    const handleCsvImport = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n').slice(1);
            let importedCount = 0;
            rows.forEach(row => {
                const columns = row.split(',');
                if (columns.length < 2) return;
                const name = columns[0].trim().replace(/"/g, '');
                let category = columns[1].trim().replace(/"/g, '');
                if (!CATEGORIES.includes(category)) category = 'Other';
                const isDuplicate = exercises.some(ex => ex.name.toLowerCase() === name.toLowerCase());
                if (name && !isDuplicate) { exercises.push({ id: Date.now() + importedCount, name, category }); importedCount++; }
            });
            if (importedCount > 0) { saveExercises(); renderExercises(); alert(`${importedCount} new exercises imported successfully!`); }
            else { alert('No new exercises were imported. They may already exist or the file format is incorrect.'); }
            csvFileInput.value = '';
        };
        reader.readAsText(file);
    };

    // Workout Log Functions
    const renderWorkoutLogView = () => {
        workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const todayWorkoutIndex = workouts.findIndex(w => w.date === getTodayDateString());
        if (todayWorkoutIndex !== -1) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            workoutDateInput.value = yesterday.toISOString().split('T')[0];
        } else {
            workoutDateInput.value = getTodayDateString();
        }
        if (currentWorkoutIndex === -1 && workouts.length > 0) { currentWorkoutIndex = 0; }
        if (currentWorkoutIndex !== -1) {
            currentWorkoutSection.style.display = 'block';
            const workout = workouts[currentWorkoutIndex];
            workoutTitle.textContent = `${workout.date} (${workout.category})`;
            const isFinished = workout.isFinished || false;
            const isToday = workout.date === getTodayDateString();
            addLogEntryForm.style.display = isFinished ? 'none' : 'block';
            workoutControls.style.display = 'block';
            finishWorkoutBtn.style.display = !isFinished && isToday ? 'inline-block' : 'none';
            editWorkoutBtn.style.display = isFinished ? 'inline-block' : 'none';
            prevWorkoutBtn.disabled = currentWorkoutIndex >= workouts.length - 1;
            nextWorkoutBtn.disabled = currentWorkoutIndex <= 0;
            renderWorkoutEntries(workout.exercises);
        } else {
            currentWorkoutSection.style.display = 'none';
        }
        renderSummaryView(summaryCategorySelect.value);
    };
    const renderWorkoutEntries = (entries) => {
        workoutLogEntries.innerHTML = '';
        if (!entries || entries.length === 0) { workoutLogEntries.innerHTML = '<p>No exercises logged for this workout yet.</p>'; return; }
        let tableHTML = '<table class="log-table"><tr><th>Exercise</th><th>Weight</th><th>Sets</th><th>Reps</th><th>Actions</th></tr>';
        entries.forEach(entry => {
            tableHTML += `<tr data-entry-id="${entry.id}"><td>${entry.name}</td><td>${entry.weight}</td><td>${entry.sets}</td><td>${entry.reps}</td><td class="actions-cell"><button class="icon-btn edit" title="Edit Entry">&#9998;</button><button class="icon-btn delete" title="Delete Entry">&#128465;</button></td></tr>`;
        });
        tableHTML += '</table>';
        workoutLogEntries.innerHTML = tableHTML;
    };
    const renderSummaryView = (category) => {
        const today = getTodayDateString();
        const lastWorkout = workouts.find(w => w.category === category && w.date !== today);
        if (!lastWorkout) { workoutSummaryContent.innerHTML = `<p>No past workout found for '${category}'.</p>`; return; }
        let summaryHTML = `<h4>${lastWorkout.date} - ${lastWorkout.category}</h4>`;
        if (!lastWorkout.exercises || lastWorkout.exercises.length === 0) { summaryHTML += '<p>No exercises were logged.</p>'; }
        else {
            summaryHTML += '<table class="log-table"><tr><th>Exercise</th><th>Weight</th><th>Sets</th><th>Reps</th></tr>';
            lastWorkout.exercises.forEach(entry => { summaryHTML += `<tr><td>${entry.name}</td><td>${entry.weight}</td><td>${entry.sets}</td><td>${entry.reps}</td></tr>`; });
            summaryHTML += '</table>';
        }
        workoutSummaryContent.innerHTML = summaryHTML;
    };
    
    // Food Log Functions
    const renderFoodLogView = () => {
        const sortedDates = Object.keys(foodLogs).sort((a, b) => new Date(b) - new Date(a));
        if (!currentFoodLogDate) {
            currentFoodLogDate = foodLogs[getTodayDateString()] ? getTodayDateString() : (sortedDates[0] || null);
        }
        if (currentFoodLogDate) {
            currentFoodLogSection.style.display = 'block';
            const log = foodLogs[currentFoodLogDate];
            const isFinished = log.isFinished || false;
            foodLogTitle.textContent = currentFoodLogDate;
            const currentIndex = sortedDates.indexOf(currentFoodLogDate);
            prevFoodLogBtn.disabled = currentIndex >= sortedDates.length - 1;
            nextFoodLogBtn.disabled = currentIndex <= 0;
            addFoodItemForm.style.display = isFinished ? 'none' : 'block';
            finishFoodLogBtn.style.display = isFinished ? 'none' : 'block';
            editFoodLogBtn.style.display = isFinished ? 'inline-block' : 'none';
            renderFoodEntries(log.items);
            calculateAndRenderTotals(log.items);
        } else {
            currentFoodLogSection.style.display = 'none';
        }
    };
    const renderFoodEntries = (items) => {
        foodLogEntries.innerHTML = '';
        if (!items || items.length === 0) { foodLogEntries.innerHTML = '<p>No food logged for this day yet.</p>'; return; }
        const groupedByMeal = items.reduce((acc, item) => { (acc[item.meal] = acc[item.meal] || []).push(item); return acc; }, {});
        MEALS.forEach(meal => {
            if (groupedByMeal[meal]?.length > 0) {
                let mealHTML = `<h4>${meal}</h4>`;
                mealHTML += '<table class="log-table"><tr><th>Food</th><th>Fat</th><th>Carbs</th><th>Protein</th><th>Cals</th><th>Actions</th></tr>';
                groupedByMeal[meal].forEach(item => {
                    mealHTML += `<tr data-entry-id="${item.id}"><td>${item.name}</td><td>${item.fat}</td><td>${item.carbs}</td><td>${item.protein}</td><td>${item.calories.toFixed(0)}</td><td class="actions-cell"><button class="icon-btn edit" title="Edit Entry">&#9998;</button><button class="icon-btn delete" title="Delete Entry">&#128465;</button></td></tr>`;
                });
                mealHTML += '</table>';
                foodLogEntries.innerHTML += mealHTML;
            }
        });
    };
    const calculateAndRenderTotals = (items) => {
        const totals = items.reduce((acc, item) => {
            acc.fat += Number(item.fat);
            acc.carbs += Number(item.carbs);
            acc.protein += Number(item.protein);
            acc.calories += Number(item.calories);
            return acc;
        }, { fat: 0, carbs: 0, protein: 0, calories: 0 });
        foodLogTotals.textContent = `Fat: ${totals.fat.toFixed(1)}g | Carbs: ${totals.carbs.toFixed(1)}g | Protein: ${totals.protein.toFixed(1)}g | Calories: ${totals.calories.toFixed(0)}`;
        renderPieChart(totals);
    };
    const renderPieChart = (totals) => {
        const ctx = document.getElementById('macro-pie-chart').getContext('2d');
        if (macroChart) { macroChart.destroy(); }
        const totalCalories = totals.calories;
        if (totalCalories === 0) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }
        const fatCalories = totals.fat * 9;
        const carbsCalories = totals.carbs * 4;
        const proteinCalories = totals.protein * 4;
        macroChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [`Fat (${(fatCalories / totalCalories * 100).toFixed(0)}%)`, `Carbs (${(carbsCalories / totalCalories * 100).toFixed(0)}%)`, `Protein (${(proteinCalories / totalCalories * 100).toFixed(0)}%)`],
                datasets: [{
                    data: [fatCalories, carbsCalories, proteinCalories],
                    backgroundColor: ['#FFC107', '#03A9F4', '#F44336'],
                    borderColor: getComputedStyle(document.body).getPropertyValue('--card-background'),
                    borderWidth: 2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } } } }
        });
    };

    // --- Event Listeners ---
    themeSwitcher.addEventListener('change', (e) => applyTheme(e.target.value));
    tabNav.addEventListener('click', (e) => { if (e.target.matches('.tab-button')) switchTab(e.target.dataset.tab); });
    
    // Manage Exercises Listeners
    addExerciseForm.addEventListener('submit', (e) => { e.preventDefault(); const name = newExerciseNameInput.value.trim(); const category = newExerciseCategorySelect.value; if (name) { exercises.push({ id: Date.now(), name, category }); saveExercises(); renderExercises(); addExerciseForm.reset(); } });
    exerciseListContainer.addEventListener('click', (e) => { const t = e.target.closest(".exercise-item"); if (!t) return; const n = Number(t.dataset.id); if (e.target.matches(".icon-btn.delete") && confirm("Are you sure you want to delete this exercise?")) { exercises = exercises.filter(e => e.id !== n); saveExercises(); renderExercises(); } if (e.target.matches(".icon-btn.edit")) { const e = exercises.find(e => e.id === n); const t = prompt("Enter the new name for the exercise:", e.name); t && t.trim() && (e.name = t.trim(), saveExercises(), renderExercises()); } });
    importCsvBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', (e) => handleCsvImport(e.target.files[0]));
    
    // Workout Log Listeners
    createWorkoutForm.addEventListener('submit', (e) => { e.preventDefault(); const date = workoutDateInput.value; const category = workoutCategorySelect.value; const bodyweight = parseFloat(workoutBodyweightInput.value) || null; if (workouts.some(w => w.date === date)) { alert('A workout for this date already exists.'); return; } workouts.push({ id: Date.now(), date, category, bodyweight, exercises: [], isFinished: false }); currentWorkoutIndex = -1; saveWorkouts(); renderWorkoutLogView(); createWorkoutForm.reset(); });
    prevWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex < workouts.length - 1) { currentWorkoutIndex++; renderWorkoutLogView(); } });
    nextWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex > 0) { currentWorkoutIndex--; renderWorkoutLogView(); } });
    deleteWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex === -1) return; if (confirm("Are you sure you want to delete this workout? This action cannot be undone.")) { workouts.splice(currentWorkoutIndex, 1); saveWorkouts(); currentWorkoutIndex = -1; renderWorkoutLogView(); } });
    searchExerciseInput.addEventListener('input', () => { const query = searchExerciseInput.value.toLowerCase(); searchResultsContainer.innerHTML = ''; if (query.length < 1) return; const filtered = exercises.filter(ex => ex.name.toLowerCase().includes(query)); filtered.forEach(ex => { const item = document.createElement('div'); item.className = 'search-result-item'; item.textContent = ex.name; item.addEventListener('click', () => { searchExerciseInput.value = ex.name; searchResultsContainer.innerHTML = ''; }); searchResultsContainer.appendChild(item); }); });
    addLogEntryForm.addEventListener('submit', (e) => { e.preventDefault(); const workout = workouts[currentWorkoutIndex]; if (!workout) return; const newEntry = { id: Date.now(), name: searchExerciseInput.value, weight: logWeightInput.value || 0, sets: logSetsInput.value || 0, reps: logRepsInput.value || 0 }; if (!newEntry.name || !exercises.some(ex => ex.name === newEntry.name)) { alert('Please select a valid exercise from the list.'); return; } workout.exercises.push(newEntry); saveWorkouts(); renderWorkoutLogView(); addLogEntryForm.reset(); renderSummaryView(summaryCategorySelect.value); });
    workoutLogEntries.addEventListener('click', (e) => { const t = e.target, n = t.closest("tr"); if (!n || -1 === currentWorkoutIndex) return; const o = Number(n.dataset.entryId), a = workouts[currentWorkoutIndex], r = a.exercises.findIndex(e => e.id === o); if (-1 === r) return; if (t.matches(".icon-btn.delete") && confirm("Delete this entry?")) { a.exercises.splice(r, 1); saveWorkouts(); renderWorkoutLogView(); } if (t.matches(".icon-btn.edit")) { const e = a.exercises[r], t = prompt("Enter new weight:", e.weight), n = prompt("Enter new sets:", e.sets), o = prompt("Enter new reps:", e.reps); null !== t && (e.weight = t || 0), null !== n && (e.sets = n || 0), null !== o && (e.reps = o || 0); saveWorkouts(); renderWorkoutLogView(); } });
    summaryCategorySelect.addEventListener('change', () => { renderSummaryView(summaryCategorySelect.value); });
    finishWorkoutBtn.addEventListener('click', () => { const workout = workouts[currentWorkoutIndex]; if (!workout) return; workout.isFinished = true; saveWorkouts(); renderWorkoutLogView(); });
    editWorkoutBtn.addEventListener('click', () => { const workout = workouts[currentWorkoutIndex]; if (!workout) return; workout.isFinished = false; saveWorkouts(); renderWorkoutLogView(); });

    // Food Log Listeners
    createFoodLogForm.addEventListener('submit', (e) => { e.preventDefault(); const date = foodLogDateInput.value; if (!foodLogs[date]) { foodLogs[date] = { items: [], isFinished: false }; } currentFoodLogDate = date; saveFoodLogs(); renderFoodLogView(); });
    prevFoodLogBtn.addEventListener('click', () => { const sortedDates = Object.keys(foodLogs).sort((a, b) => new Date(b) - new Date(a)); const currentIndex = sortedDates.indexOf(currentFoodLogDate); if (currentIndex < sortedDates.length - 1) { currentFoodLogDate = sortedDates[currentIndex + 1]; renderFoodLogView(); } });
    nextFoodLogBtn.addEventListener('click', () => { const sortedDates = Object.keys(foodLogs).sort((a, b) => new Date(b) - new Date(a)); const currentIndex = sortedDates.indexOf(currentFoodLogDate); if (currentIndex > 0) { currentFoodLogDate = sortedDates[currentIndex - 1]; renderFoodLogView(); } });
    addFoodItemForm.addEventListener('submit', (e) => { e.preventDefault(); if (!currentFoodLogDate) return; const fat = parseFloat(foodItemFatInput.value) || 0; const carbs = parseFloat(foodItemCarbsInput.value) || 0; const protein = parseFloat(foodItemProteinInput.value) || 0; const name = foodItemNameInput.value.trim(); if (!name) { alert("Please enter a food name."); return; } const newItem = { id: Date.now(), name, meal: foodItemMealSelect.value, fat, carbs, protein, calories: (fat * 9) + (carbs * 4) + (protein * 4) }; foodLogs[currentFoodLogDate].items.push(newItem); if (!uniqueFoods.some(food => food.name.toLowerCase() === name.toLowerCase())) { uniqueFoods.push({ name, fat, carbs, protein }); saveUniqueFoods(); } saveFoodLogs(); renderFoodLogView(); addFoodItemForm.reset(); foodItemNameInput.focus(); });
    deleteFoodLogBtn.addEventListener('click', () => { if (!currentFoodLogDate) return; if (confirm("Are you sure you want to delete this entire day's food log? This action cannot be undone.")) { delete foodLogs[currentFoodLogDate]; currentFoodLogDate = null; saveFoodLogs(); renderFoodLogView(); } });
    finishFoodLogBtn.addEventListener('click', () => { const log = foodLogs[currentFoodLogDate]; if (log) { log.isFinished = true; saveFoodLogs(); renderFoodLogView(); } });
    editFoodLogBtn.addEventListener('click', () => { const log = foodLogs[currentFoodLogDate]; if (log) { log.isFinished = false; saveFoodLogs(); renderFoodLogView(); } });
    foodLogEntries.addEventListener('click', (e) => { const target = e.target; const entryRow = target.closest('tr'); if (!entryRow || !currentFoodLogDate) return; const entryId = Number(entryRow.dataset.entryId); const log = foodLogs[currentFoodLogDate]; const entryIndex = log.items.findIndex(item => item.id === entryId); if (entryIndex === -1) return; if (target.matches('.icon-btn.delete')) { if (confirm('Delete this food entry?')) { log.items.splice(entryIndex, 1); saveFoodLogs(); renderFoodLogView(); } } if (target.matches('.icon-btn.edit')) { const item = log.items[entryIndex]; const newName = prompt('Enter new food name:', item.name); const newFat = prompt('Enter new fat (g):', item.fat); const newCarbs = prompt('Enter new carbs (g):', item.carbs); const newProtein = prompt('Enter new protein (g):', item.protein); if (newName !== null) item.name = newName; if (newFat !== null) item.fat = parseFloat(newFat) || 0; if (newCarbs !== null) item.carbs = parseFloat(newCarbs) || 0; if (newProtein !== null) item.protein = parseFloat(newProtein) || 0; item.calories = (item.fat * 9) + (item.carbs * 4) + (item.protein * 4); saveFoodLogs(); renderFoodLogView(); } });
    foodItemNameInput.addEventListener('input', () => { const query = foodItemNameInput.value.toLowerCase(); foodSearchResultsContainer.innerHTML = ''; if (query.length < 1) return; const filtered = uniqueFoods.filter(food => food.name.toLowerCase().includes(query)); filtered.forEach(food => { const item = document.createElement('div'); item.className = 'search-result-item'; item.textContent = food.name; item.addEventListener('click', () => { foodItemNameInput.value = food.name; foodItemFatInput.value = food.fat; foodItemCarbsInput.value = food.carbs; foodItemProteinInput.value = food.protein; foodSearchResultsContainer.innerHTML = ''; }); foodSearchResultsContainer.appendChild(item); }); });
    
    // --- Initialization ---
    const initializeApp = () => {
        loadTheme();
        populateUniqueFoods();
        let categoryOptions = '';
        CATEGORIES.forEach(cat => categoryOptions += `<option value="${cat}">${cat}</option>`);
        workoutCategorySelect.innerHTML = categoryOptions;
        summaryCategorySelect.innerHTML = categoryOptions;
        foodLogDateInput.value = getTodayDateString();
        workoutDateInput.value = getTodayDateString();
        switchTab('tab-workout-log');
    };

    initializeApp();
});