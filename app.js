document.addEventListener('DOMContentLoaded', () => {

    // --- App State & Constants ---
    const CATEGORIES = ['Push', 'Pull', 'Legs', 'Other'];
    const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    let currentUserId = null;
    let exercises = [];
    let workouts = [];
    let foodLogs = {};
    let uniqueFoods = [];
    let userGoals = {};
    let currentWorkoutIndex = -1;
    let currentFoodLogDate = null;
    let macroChart, caloriesChart, proteinChart, weightChart;

    // --- DOM Elements ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const authError = document.getElementById('auth-error');
    const userNameDisplay = document.getElementById('user-name-display');
    const logoutBtn = document.getElementById('logout-btn');
    const themeSwitcher = document.getElementById('theme-switcher');
    const tabNav = document.getElementById('tab-nav');
    const tabContents = document.querySelectorAll('.tab-content');
    const addExerciseForm = document.getElementById('add-exercise-form');
    const newExerciseNameInput = document.getElementById('new-exercise-name');
    const newExerciseCategorySelect = document.getElementById('new-exercise-category');
    const exerciseListContainer = document.getElementById('exercise-list-container');
    const csvFileInput = document.getElementById('csv-file-input');
    const importCsvBtn = document.getElementById('import-csv-btn');
    const createWorkoutForm = document.getElementById('create-workout-form');
    const workoutDateInput = document.getElementById('workout-date');
    const workoutBodyweightInput = document.getElementById('workout-bodyweight');
    const workoutCategorySelect = document.getElementById('workout-category');
    const currentWorkoutSection = document.getElementById('current-workout-section');
    const workoutTitle = document.getElementById('workout-title');
    const bodyweightDisplayContainer = document.getElementById('bodyweight-display-container');
    const bodyweightValue = document.getElementById('bodyweight-value');
    const editBodyweightBtn = document.getElementById('edit-bodyweight-btn');
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
    const calorieGoalProgress = document.getElementById('calorie-goal-progress');
    const finishFoodLogBtn = document.getElementById('finish-food-log-btn');
    const prContainer = document.getElementById('pr-container');
    const usdaSearchForm = document.getElementById('usda-search-form');
    const usdaSearchInput = document.getElementById('usda-search-input');
    const usdaSearchResultsContainer = document.getElementById('usda-search-results-container');
    const aboutMeForm = document.getElementById('about-me-form');
    const aboutSex = document.getElementById('about-sex');
    const aboutAge = document.getElementById('about-age');
    const aboutHeight = document.getElementById('about-height');
    const aboutStartWeight = document.getElementById('about-start-weight');
    const aboutGoalWeight = document.getElementById('about-goal-weight');
    const aboutActivityLevel = document.getElementById('about-activity-level');
    const calorieResultsContainer = document.getElementById('calorie-results-container');
    const saveAboutMeBtn = document.getElementById('save-about-me-btn');
    const editAboutMeBtn = document.getElementById('edit-about-me-btn');
    const myProgressTab = document.getElementById('tab-my-progress');
    const foodLogTab = document.getElementById('tab-food-log');

    // --- Core Functions ---
    const sanitizeNameForId = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const showApp = () => { authContainer.style.display = 'none'; appContainer.style.display = 'block'; };
    const showAuth = () => { authContainer.style.display = 'flex'; appContainer.style.display = 'none'; };
    const getTodayDateString = () => new Date().toISOString().split('T')[0];
    
    const applyTheme = (themeName) => {
        document.body.className = '';
        document.body.classList.add(themeName);
        localStorage.setItem('freilifts_theme', themeName);
        if (currentUserId) {
            ApiService.savePreferencesForUser(currentUserId, { theme: themeName, goals: userGoals, about: getAboutMeData() });
        }
    };

    const loadTheme = () => {
        const savedTheme = localStorage.getItem('freilifts_theme') || 'theme-dark';
        themeSwitcher.value = savedTheme;
        applyTheme(savedTheme);
    };

    const switchTab = (tabId) => {
        document.querySelectorAll('.tab-button').forEach(button => button.classList.toggle('active', button.dataset.tab === tabId));
        tabContents.forEach(content => content.classList.toggle('active', content.id === tabId));
        if (tabId === 'tab-workout-log') renderWorkoutLogView();
        if (tabId === 'tab-manage-exercises') renderExercises();
        if (tabId === 'tab-food-log') renderFoodLogView();
        if (tabId === 'tab-personal-records') calculateAndRenderPRs();
        if (tabId === 'tab-my-progress') renderProgressCharts();
        if (tabId === 'tab-about-me') loadAboutMeData();
    };

    const loadUserAndInitializeApp = (userId, userName) => {
        currentUserId = userId;
        localStorage.setItem('freilifts_loggedInUser', JSON.stringify({ id: userId, name: userName }));
        userNameDisplay.textContent = `Welcome, ${userName}`;
        showApp();
        
        ApiService.loadUser(userId).then(snapshot => {
            const userData = snapshot.val() || {};
            const data = userData.data || {};
            const prefs = userData.preferences || {};
            exercises = data.exercises || [];
            workouts = data.workouts || [];
            foodLogs = data.foodLogs || {};
            uniqueFoods = data.uniqueFoods || [];
            userGoals = prefs.goals || {};

            const userTheme = prefs.theme || 'theme-dark';
            themeSwitcher.value = userTheme;
            applyTheme(userTheme);
            
            const hasAboutMeData = !!prefs.about;
            const initialTab = hasAboutMeData ? 'tab-workout-log' : 'tab-about-me';

            if (prefs.about) {
                aboutSex.value = prefs.about.sex || 'male';
                aboutAge.value = prefs.about.age || '';
                aboutHeight.value = prefs.about.height || '';
                aboutStartWeight.value = prefs.about.startWeight || '';
                aboutGoalWeight.value = prefs.about.goalWeight || '';
                aboutActivityLevel.value = prefs.about.activityLevel || '1.55';
            }
            populateUniqueFoods();
            switchTab(initialTab);
        });
    };
    
    const getAboutMeData = () => ({
        sex: aboutSex.value,
        age: aboutAge.value,
        height: aboutHeight.value,
        startWeight: aboutStartWeight.value,
        goalWeight: aboutGoalWeight.value,
        activityLevel: aboutActivityLevel.value,
    });
    
    const populateUniqueFoods = () => {
        const foodMap = new Map();
        (uniqueFoods || []).forEach(food => {
            if (food && food.name) {
                foodMap.set(food.name.toLowerCase(), food);
            }
        });
        Object.values(foodLogs).forEach(log => {
            (log.items || []).forEach(item => {
                if (item && item.name) {
                    const canonicalName = item.name.replace(/\s\([^)]+\)$/, '').trim();
                    if (!foodMap.has(canonicalName.toLowerCase())) {
                        foodMap.set(canonicalName.toLowerCase(), { name: canonicalName, fat: item.fat, carbs: item.carbs, protein: item.protein });
                    }
                }
            });
        });
        uniqueFoods = Array.from(foodMap.values());
    };

    const renderExercises = () => { /* ... */ };
    const handleCsvImport = (file) => { /* ... */ };
    const renderWorkoutLogView = () => { /* ... */ };
    const renderWorkoutEntries = (entries) => { /* ... */ };
    const renderSummaryView = (category) => { /* ... */ };
    const renderFoodLogView = () => { /* ... */ };
    const renderFoodEntries = (items) => { /* ... */ };
    const calculateAndRenderTotals = (items) => { /* ... */ };
    const renderPieChart = (totals) => { /* ... */ };
    const calculateAndRenderPRs = () => { /* ... */ };
    const renderProgressCharts = () => { /* ... */ };
    const renderLineChart = (canvasId, chartInstance, labels, data, label, color, goalValue) => { /* ... */ };
    const searchUsdaApi = (query) => { /* ... */ };
    const loadAboutMeData = () => { /* ... */ };
    const calculateAndDisplayCalories = () => { /* ... */ };
    const enterAboutMeEditMode = () => { /* ... */ };
    const exitAboutMeEditMode = () => { /* ... */ };

    // --- Event Listeners ---
    themeSwitcher.addEventListener('change', (e) => applyTheme(e.target.value));
    tabNav.addEventListener('click', (e) => { if (e.target.matches('.tab-button')) switchTab(e.target.dataset.tab); });
    logoutBtn.addEventListener('click', () => { currentUserId = null; localStorage.removeItem('freilifts_loggedInUser'); location.reload(); });
    showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; authError.textContent = ''; });
    showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'block'; registerForm.style.display = 'none'; authError.textContent = ''; });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        authError.textContent = '';
        const name = document.getElementById('register-name').value;
        const pin = document.getElementById('register-pin').value;
        const userId = sanitizeNameForId(name);
        if (!userId) { authError.textContent = 'Name cannot be empty.'; return; }
        if (pin.length < 4 || pin.length > 8) { authError.textContent = 'PIN must be 4-8 characters.'; return; }
        
        ApiService.registerUser(userId, name, pin)
            .then(() => {
                const defaultExercisesWithId = DEFAULT_EXERCISES.map((ex, i) => ({...ex, id: Date.now() + i}));
                const defaultData = { exercises: defaultExercisesWithId, workouts: [], foodLogs: {}, uniqueFoods: [] };
                return ApiService.saveDataForUser(userId, defaultData);
            })
            .then(() => {
                loadUserAndInitializeApp(userId, name);
            })
            .catch(error => {
                authError.textContent = error.message;
            });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        authError.textContent = '';
        const name = document.getElementById('login-name').value;
        const pin = document.getElementById('login-pin').value;
        const userId = sanitizeNameForId(name);
        if (!userId) { authError.textContent = 'Please enter your name.'; return; }
        
        ApiService.loadUser(userId).then(snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.pin === pin) {
                    loadUserAndInitializeApp(userId, userData.name);
                } else {
                    authError.textContent = 'Incorrect PIN.';
                }
            } else {
                authError.textContent = 'User not found.';
            }
        });
    });

    aboutMeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const aboutData = getAboutMeData();
        const prefs = {
            about: aboutData,
            goals: userGoals,
            theme: themeSwitcher.value
        };
        ApiService.savePreferencesForUser(currentUserId, prefs)
            .then(() => {
                alert('Your information has been saved!');
                calculateAndDisplayCalories();
                exitAboutMeEditMode();
            });
    });
    
    editAboutMeBtn.addEventListener('click', () => {
        enterAboutMeEditMode();
    });

    addExerciseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = newExerciseNameInput.value.trim();
        const category = newExerciseCategorySelect.value;
        if (name) {
            (exercises || []).push({ id: Date.now(), name, category });
            saveDataToFirebase();
            renderExercises();
            addExerciseForm.reset();
        }
    });

    exerciseListContainer.addEventListener('click', (e) => {
        const item = e.target.closest(".exercise-item");
        if (!item) return;
        const id = Number(item.dataset.id);
        if (e.target.matches(".icon-btn.delete")) {
            if (confirm("Are you sure?")) {
                exercises = (exercises || []).filter(ex => ex.id !== id);
                saveDataToFirebase();
                renderExercises();
            }
        }
        if (e.target.matches(".icon-btn.edit")) {
            const exercise = (exercises || []).find(ex => ex.id === id);
            const newName = prompt("Enter new name:", exercise.name);
            if (newName && newName.trim()) {
                exercise.name = newName.trim();
                saveDataToFirebase();
                renderExercises();
            }
        }
    });

    importCsvBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', (e) => handleCsvImport(e.target.files[0]));
    
    createWorkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = workoutDateInput.value;
        const category = workoutCategorySelect.value;
        const bodyweight = parseFloat(workoutBodyweightInput.value) || null;
        if ((workouts || []).some(w => w.date === date)) {
            alert('A workout for this date already exists.');
            return;
        }
        (workouts || []).push({ id: Date.now(), date, category, bodyweight, exercises: [], isFinished: false });
        currentWorkoutIndex = 0;
        saveDataToFirebase();
        renderWorkoutLogView();
        createWorkoutForm.reset();
    });

    editBodyweightBtn.addEventListener('click', () => {
        if (currentWorkoutIndex === -1) return;
        const workout = workouts[currentWorkoutIndex];
        const newBodyweight = prompt('Enter new body weight (lbs):', workout.bodyweight || '');
        if (newBodyweight === null) return;
        const newBwValue = parseFloat(newBodyweight);
        workout.bodyweight = !isNaN(newBwValue) ? newBwValue : null;
        saveDataToFirebase();
        renderWorkoutLogView();
    });

    prevWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex < (workouts || []).length - 1) { currentWorkoutIndex++; renderWorkoutLogView(); } });
    nextWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex > 0) { currentWorkoutIndex--; renderWorkoutLogView(); } });
    deleteWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex === -1) return; if (confirm("Are you sure?")) { workouts.splice(currentWorkoutIndex, 1); saveDataToFirebase(); currentWorkoutIndex = -1; renderWorkoutLogView(); } });
    searchExerciseInput.addEventListener('input', () => { const query = searchExerciseInput.value.toLowerCase(); searchResultsContainer.innerHTML = ''; if (query.length < 1) return; const filtered = (exercises || []).filter(ex => ex.name.toLowerCase().includes(query)); filtered.forEach(ex => { const item = document.createElement('div'); item.className = 'search-result-item'; item.textContent = ex.name; item.addEventListener('click', () => { searchExerciseInput.value = ex.name; searchResultsContainer.innerHTML = ''; }); searchResultsContainer.appendChild(item); }); });
    addLogEntryForm.addEventListener('submit', (e) => { e.preventDefault(); const workout = workouts[currentWorkoutIndex]; if (!workout) return; const newEntry = { id: Date.now(), name: searchExerciseInput.value, weight: logWeightInput.value || 0, sets: logSetsInput.value || 0, reps: logRepsInput.value || 0 }; if (!newEntry.name || !(exercises || []).some(ex => ex.name === newEntry.name)) { alert('Please select a valid exercise from the list.'); return; } (workout.exercises = workout.exercises || []).push(newEntry); saveDataToFirebase(); renderWorkoutLogView(); addLogEntryForm.reset(); });
    workoutLogEntries.addEventListener('click', (e) => { const t = e.target, n = t.closest("tr"); if (!n || -1 === currentWorkoutIndex) return; const o = Number(n.dataset.entryId), a = workouts[currentWorkoutIndex], r = (a.exercises || []).findIndex(e => e.id === o); if (-1 === r) return; if (t.matches(".icon-btn.delete") && confirm("Delete?")) { a.exercises.splice(r, 1); saveDataToFirebase(); renderWorkoutLogView(); } if (t.matches(".icon-btn.edit")) { const e = a.exercises[r], t = prompt("New weight:", e.weight), n = prompt("New sets:", e.sets), o = prompt("New reps:", e.reps); if (t !== null) e.weight = t || 0; if (n !== null) e.sets = n || 0; if (o !== null) e.reps = o || 0; saveDataToFirebase(); renderWorkoutLogView(); } });
    summaryCategorySelect.addEventListener('change', () => { renderSummaryView(summaryCategorySelect.value); });
    finishWorkoutBtn.addEventListener('click', () => { const workout = workouts[currentWorkoutIndex]; if (!workout) return; workout.isFinished = true; saveDataToFirebase(); renderWorkoutLogView(); });
    editWorkoutBtn.addEventListener('click', () => { const workout = workouts[currentWorkoutIndex]; if (!workout) return; workout.isFinished = false; saveDataToFirebase(); renderWorkoutLogView(); });
    usdaSearchForm.addEventListener('submit', (e) => { e.preventDefault(); const query = usdaSearchInput.value.trim(); if (query) searchUsdaApi(query); });
    createFoodLogForm.addEventListener('submit', (e) => { e.preventDefault(); const date = foodLogDateInput.value; if (!foodLogs[date]) { foodLogs[date] = { items: [], isFinished: false }; } currentFoodLogDate = date; saveDataToFirebase(); renderFoodLogView(); });
    prevFoodLogBtn.addEventListener('click', () => { const sortedDates = Object.keys(foodLogs).sort((a, b) => new Date(b) - new Date(a)); const currentIndex = sortedDates.indexOf(currentFoodLogDate); if (currentIndex < sortedDates.length - 1) { currentFoodLogDate = sortedDates[currentIndex + 1]; renderFoodLogView(); } });
    nextFoodLogBtn.addEventListener('click', () => { const sortedDates = Object.keys(foodLogs).sort((a, b) => new Date(b) - new Date(a)); const currentIndex = sortedDates.indexOf(currentFoodLogDate); if (currentIndex > 0) { currentFoodLogDate = sortedDates[currentIndex - 1]; renderFoodLogView(); } });
    addFoodItemForm.addEventListener('submit', (e) => { e.preventDefault(); if (!currentFoodLogDate) return; const fat = parseFloat(foodItemFatInput.value) || 0; const carbs = parseFloat(foodItemCarbsInput.value) || 0; const protein = parseFloat(foodItemProteinInput.value) || 0; const displayName = foodItemNameInput.value.trim(); if (!displayName) { alert("Please enter a food name."); return; } const canonicalName = displayName.replace(/\s\([^)]+\)$/, '').trim(); const newItem = { id: Date.now(), name: displayName, meal: foodItemMealSelect.value, fat, carbs, protein, calories: (fat * 9) + (carbs * 4) + (protein * 4) }; (foodLogs[currentFoodLogDate].items = foodLogs[currentFoodLogDate].items || []).push(newItem); const isNewUnique = !(uniqueFoods || []).some(food => food.name.toLowerCase() === canonicalName.toLowerCase()); if (isNewUnique) { (uniqueFoods || []).push({ name: canonicalName, fat, carbs, protein }); } saveDataToFirebase(); renderFoodLogView(); addFoodItemForm.reset(); foodItemNameInput.focus(); });
    deleteFoodLogBtn.addEventListener('click', () => { if (!currentFoodLogDate) return; if (confirm("Delete this day's food log?")) { delete foodLogs[currentFoodLogDate]; saveDataToFirebase(); currentFoodLogDate = null; renderFoodLogView(); } });
    finishFoodLogBtn.addEventListener('click', () => { const log = foodLogs[currentFoodLogDate]; if (log) { log.isFinished = true; saveDataToFirebase(); renderFoodLogView(); } });
    editFoodLogBtn.addEventListener('click', () => { const log = foodLogs[currentFoodLogDate]; if (log) { log.isFinished = false; saveDataToFirebase(); renderFoodLogView(); } });
    foodLogEntries.addEventListener('click', (e) => { const target = e.target; const entryRow = target.closest('tr'); if (!entryRow || !currentFoodLogDate) return; const entryId = Number(entryRow.dataset.entryId); const log = foodLogs[currentFoodLogDate]; const entryIndex = (log.items || []).findIndex(item => item.id === entryId); if (entryIndex === -1) return; if (target.matches('.icon-btn.delete')) { if (confirm('Delete food entry?')) { log.items.splice(entryIndex, 1); saveDataToFirebase(); renderFoodLogView(); } } if (target.matches('.icon-btn.edit')) { const item = log.items[entryIndex]; const newName = prompt('New food name:', item.name); const newFat = prompt('New fat (g):', item.fat); const newCarbs = prompt('New carbs (g):', item.carbs); const newProtein = prompt('New protein (g):', item.protein); if (newName !== null) item.name = newName; if (newFat !== null) item.fat = parseFloat(newFat) || 0; if (newCarbs !== null) item.carbs = parseFloat(newCarbs) || 0; if (newProtein !== null) item.protein = parseFloat(newProtein) || 0; item.calories = (item.fat * 9) + (item.carbs * 4) + (item.protein * 4); saveDataToFirebase(); renderFoodLogView(); } });
    foodItemNameInput.addEventListener('input', () => { const query = foodItemNameInput.value.toLowerCase(); foodSearchResultsContainer.innerHTML = ''; if (query.length < 1) return; const filtered = (uniqueFoods || []).filter(food => food.name.toLowerCase().includes(query)); filtered.forEach(food => { const item = document.createElement('div'); item.className = 'search-result-item'; item.dataset.foodName = food.name; item.innerHTML = `<span>${food.name}</span><button class="icon-btn delete" title="Delete Saved Food" data-food-name="${food.name}">&#128465;</button>`; foodSearchResultsContainer.appendChild(item); }); });
    foodSearchResultsContainer.addEventListener('click', (e) => { const resultItem = e.target.closest('.search-result-item'); if (!resultItem) return; const foodName = resultItem.dataset.foodName; if (e.target.matches('.delete')) { e.stopPropagation(); if (confirm(`Are you sure you want to permanently delete "${foodName}" from your saved foods?`)) { uniqueFoods = uniqueFoods.filter(food => food.name !== foodName); saveDataToFirebase(); foodSearchResultsContainer.innerHTML = ''; } } else { const food = uniqueFoods.find(f => f.name === foodName); if (!food) return; const servings = prompt(`'${food.name}'\n\nHow many servings did you have?`, '1'); if (servings === null) return; const numServings = parseFloat(servings) || 1; foodItemNameInput.value = numServings !== 1 ? `${food.name} (${numServings} servings)` : food.name; foodItemFatInput.value = (food.fat * numServings).toFixed(1); foodItemCarbsInput.value = (food.carbs * numServings).toFixed(1); foodItemProteinInput.value = (food.protein * numServings).toFixed(1); foodSearchResultsContainer.innerHTML = ''; } });
    foodItemNameInput.addEventListener('blur', () => { setTimeout(() => { foodSearchResultsContainer.innerHTML = ''; }, 200); });
    myProgressTab.addEventListener('click', (e) => { if (e.target.matches('.reset-zoom-btn')) { const chartId = e.target.dataset.chartId; if (chartId === 'calories-chart' && caloriesChart) { caloriesChart.resetZoom(); } else if (chartId === 'protein-chart' && proteinChart) { proteinChart.resetZoom(); } else if (chartId === 'weight-chart' && weightChart) { weightChart.resetZoom(); } } });
    foodLogTab.addEventListener('click', (e) => { const header = e.target.closest('.card-header-with-action'); if (header) { const card = header.closest('.card'); if (card) { const content = card.querySelector('.collapsible-content'); const button = header.querySelector('.collapse-toggle-btn'); if (content && button) { button.classList.toggle('collapsed'); content.classList.toggle('collapsed'); } } } });

    // --- Initialization ---
    const initializeApp = () => {
        loadTheme();
        let categoryOptions = '';
        CATEGORIES.forEach(cat => categoryOptions += `<option value="${cat}">${cat}</option>`);
        workoutCategorySelect.innerHTML = categoryOptions;
        summaryCategorySelect.innerHTML = categoryOptions;
        foodLogDateInput.value = getTodayDateString();
        workoutDateInput.value = getTodayDateString();
        
        const rememberedUser = JSON.parse(localStorage.getItem('freilifts_loggedInUser'));
        if (rememberedUser) {
            loadUserAndInitializeApp(rememberedUser.id, rememberedUser.name);
        } else {
            showAuth();
        }
    };

    initializeApp();
});
