document.addEventListener('DOMContentLoaded', () => {

    // IMPORTANT: Replace with your actual Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyDSb6HjEPLfkcgUA-MKJxyWwkjdCjZHj2k",
    authDomain: "freilifts-app.firebaseapp.com",
    databaseURL: "https://freilifts-app-default-rtdb.firebaseio.com",
    projectId: "freilifts-app",
    storageBucket: "freilifts-app.firebasestorage.app",
    messagingSenderId: "631799148653",
    appId: "1:631799148653:web:bbf030eba362eb7312cf64"
  };

    // IMPORTANT: Get your free API key from https://fdc.nal.usda.gov/api-key-signup.html
    const USDA_API_KEY = 'aemBTeknGhNmAlKKGpJUiewRCOMdaAVYlAtK91an';

    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

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
    let editingEntryId = null; // For in-line workout editing
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
    const importCsvBtn = document.getElementById('import-csv-btn');
    const csvFileInput = document.getElementById('csv-file-input');
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

    // DOM Elements for Food Search UX
    const foodMacroDetails = document.getElementById('food-macro-details');
    const foodItemQuantityInput = document.getElementById('food-item-quantity');
    const foodItemUnitSelect = document.getElementById('food-item-unit');


    // --- Core & Helper Functions ---
    const sanitizeNameForId = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const showApp = () => { authContainer.style.display = 'none'; appContainer.style.display = 'block'; };
    const showAuth = () => { authContainer.style.display = 'flex'; appContainer.style.display = 'none'; };
    const getTodayDateString = () => new Date().toISOString().split('T')[0];
    
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const applyTheme = (themeName) => {
        document.body.className = '';
        document.body.classList.add(themeName);
        localStorage.setItem('freilifts_theme', themeName);
        if (currentUserId) { db.ref(`users/${currentUserId}/preferences/theme`).set(themeName); }
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

    const saveDataToFirebase = () => {
        if (!currentUserId) return;
        const userData = { exercises, workouts, foodLogs, uniqueFoods };
        db.ref('users/' + currentUserId + '/data').set(userData);
    };
    
    const loadUserAndInitializeApp = (userId, userName) => {
        currentUserId = userId;
        localStorage.setItem('freilifts_loggedInUser', JSON.stringify({ id: userId, name: userName }));
        userNameDisplay.textContent = `Welcome, ${userName}`;
        showApp();
        db.ref('users/' + userId).once('value', (snapshot) => {
            const userData = snapshot.val() || {};
            const data = userData.data || {};
            const prefs = userData.preferences || {};
            
            let userExercises = data.exercises || [];
            workouts = data.workouts || [];
            foodLogs = data.foodLogs || {};
            uniqueFoods = data.uniqueFoods || [];
            userGoals = prefs.goals || {};
            
            // --- NEW: Merge predefined exercises with user's list ---
            const existingExerciseNames = new Set(userExercises.map(ex => ex.name.toLowerCase()));
            let newExercisesAdded = false;
            PREDEFINED_EXERCISES.forEach(predefinedEx => {
                if (!existingExerciseNames.has(predefinedEx.name.toLowerCase())) {
                    userExercises.push(predefinedEx);
                    newExercisesAdded = true;
                }
            });
    
            // Assign the potentially merged list to the global state
            exercises = userExercises;
    
            // If we added new exercises, save the updated list back to Firebase
            if (newExercisesAdded) {
                db.ref(`users/${currentUserId}/data/exercises`).set(exercises);
            }
            // --- END OF MERGE LOGIC ---
    
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

    const searchUsdaApi = async (query) => {
        const container = foodSearchResultsContainer;
        const loader = document.getElementById('usda-search-loader');
        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=5`;

        try {
            const response = await fetch(url);
            if (!response.ok) { throw new Error(`API Error: ${response.statusText}`); }
            const data = await response.json();

            if (loader) loader.remove();

            if (!data.foods || data.foods.length === 0) {
                const noResults = document.createElement('p');
                noResults.textContent = 'No USDA results found.';
                noResults.className = 'search-meta-info';
                container.appendChild(noResults);
                return;
            }

            let usdaResultsHTML = '<h6 class="search-results-header">USDA Database</h6>';
            data.foods.forEach(food => {
                const protein = food.foodNutrients.find(n => n.nutrientNumber === "203")?.value || 0;
                const fat = food.foodNutrients.find(n => n.nutrientNumber === "204")?.value || 0;
                const carbs = food.foodNutrients.find(n => n.nutrientNumber === "205")?.value || 0;

                usdaResultsHTML += `
                    <div class="search-result-item" 
                         data-food-type="usda" 
                         data-food-name="${food.description}" 
                         data-base-fat="${fat}" 
                         data-base-carbs="${carbs}" 
                         data-base-protein="${protein}">
                        <strong>${food.description}</strong>
                        <small>(per 100g) - P: ${protein}g, C: ${carbs}g, F: ${fat}g</small>
                    </div>`;
            });

            container.innerHTML += usdaResultsHTML;

        } catch (error) {
            if (loader) loader.remove();
            container.innerHTML += `<p style="color: var(--danger-color);">Error fetching data. Check API key and network.</p>`;
            console.error("USDA API Fetch Error:", error);
        }
    };
    const debouncedUsdaSearch = debounce(searchUsdaApi, 500);

    const getMacroColorClass = (current, goal) => {
        if (goal <= 0) return 'macro-default'; // No goal set, use default color

        const percentage = (current / goal) * 100;

        if (percentage > 125) return 'macro-red';      // Significantly over budget
        if (percentage >= 75) return 'macro-green';    // On target (75% - 125%)
        if (percentage >= 50) return 'macro-yellow';   // Approaching target (50% - 74.9%)
    
        return 'macro-red'; // Well under budget (< 50%)
    };

    // --- Render Functions ---
    const renderExercises = () => {
        const layoutContainer = document.getElementById('exercise-list-layout'); 
        if (!layoutContainer) return;
    
        layoutContainer.innerHTML = '';
    
        if (!exercises || exercises.length === 0) {
            layoutContainer.innerHTML = '<p>No exercises added yet.</p>';
            return;
        }
    
        const grouped = exercises.reduce((acc, ex) => {
            (acc[ex.category] = acc[ex.category] || []).push(ex);
            return acc;
        }, {});
    
        CATEGORIES.forEach(cat => {
            if (grouped[cat]?.length > 0) {
                grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    
                let cardHTML = `<div class="card exercise-category-card">`;
                cardHTML += `<h3>${cat}</h3>`;
    
                grouped[cat].forEach(ex => {
                    cardHTML += `
                        <div class="exercise-item" data-id="${ex.id}">
                            <span>${ex.name}</span>
                            <div class="actions">
                                <button class="icon-btn edit" title="Edit Exercise">&#9998;</button>
                                <button class="icon-btn delete" title="Delete Exercise">&#128465;</button>
                            </div>
                        </div>`;
                });
    
                cardHTML += `</div>`;
    
                layoutContainer.innerHTML += cardHTML;
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
                const isDuplicate = (exercises || []).some(ex => ex.name.toLowerCase() === name.toLowerCase());
                if (name && !isDuplicate) {
                    (exercises || []).push({ id: Date.now() + importedCount, name, category });
                    importedCount++;
                }
            });
            if (importedCount > 0) {
                saveDataToFirebase();
                renderExercises();
            } else {
                alert('No new exercises were imported.');
            }
            csvFileInput.value = '';
        };
        reader.readAsText(file);
    };

    const renderWorkoutLogView = () => {
        (workouts || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        const todayWorkoutIndex = (workouts || []).findIndex(w => w.date === getTodayDateString());
        if (todayWorkoutIndex !== -1) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            workoutDateInput.value = yesterday.toISOString().split('T')[0];
        } else {
            workoutDateInput.value = getTodayDateString();
        }
        if (currentWorkoutIndex === -1 && (workouts || []).length > 0) {
            currentWorkoutIndex = 0;
        }
        if (currentWorkoutIndex !== -1 && workouts[currentWorkoutIndex]) {
            currentWorkoutSection.style.display = 'block';
            const workout = workouts[currentWorkoutIndex];
            workoutTitle.textContent = `${workout.date} (${workout.category})`;
            if (workout.bodyweight && workout.bodyweight > 0) {
                bodyweightValue.textContent = workout.bodyweight;
                bodyweightDisplayContainer.style.display = 'block';
            } else {
                bodyweightDisplayContainer.style.display = 'none';
            }
            const isFinished = workout.isFinished || false;
            addLogEntryForm.style.display = isFinished ? 'none' : 'block';
            workoutControls.style.display = 'block';
            finishWorkoutBtn.style.display = !isFinished ? 'inline-block' : 'none';
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
        if (!entries || entries.length === 0) {
            workoutLogEntries.innerHTML = '<p>No exercises logged yet.</p>';
            return;
        }
    
        let tableHTML = '<table class="log-table"><tr><th>Exercise</th><th>Weight</th><th>Sets</th><th>Reps</th><th class="actions-cell"></th></tr>';
    
        entries.forEach(entry => {
            if (entry.id === editingEntryId) {
                // --- EDIT MODE ROW ---
                tableHTML += `
                    <tr class="edit-mode" data-entry-id="${entry.id}">
                        <td>
                            <div style="position: relative;">
                                <input type="text" class="edit-exercise-name" value="${entry.name}" autocomplete="off">
                                <div class="search-results-container-inline"></div>
                            </div>
                        </td>
                        <td><input type="number" class="edit-weight" value="${entry.weight}" step="0.1"></td>
                        <td><input type="number" class="edit-sets" value="${entry.sets}"></td>
                        <td><input type="number" class="edit-reps" value="${entry.reps}"></td>
                        <td class="actions-cell">
                            <button class="icon-btn save" title="Save Changes">&#10004;</button>
                            <button class="icon-btn cancel" title="Cancel Edit">&#10006;</button>
                        </td>
                    </tr>`;
            } else {
                // --- VIEW MODE ROW ---
                tableHTML += `
                    <tr data-entry-id="${entry.id}">
                        <td>${entry.name}</td>
                        <td>${entry.weight}</td>
                        <td>${entry.sets}</td>
                        <td>${entry.reps}</td>
                        <td class="actions-cell">
                            <button class="icon-btn edit" title="Edit Entry">&#9998;</button>
                            <button class="icon-btn delete" title="Delete Entry">&#128465;</button>
                        </td>
                    </tr>`;
            }
        });
    
        tableHTML += '</table>';
        workoutLogEntries.innerHTML = tableHTML;
    };

    const renderSummaryView = (category) => {
        const today = getTodayDateString();
        const lastWorkout = (workouts || []).find(w => w.category === category && w.date !== today);
        if (!lastWorkout) {
            workoutSummaryContent.innerHTML = `<p>No past workout found for '${category}'.</p>`;
            return;
        }
        let summaryHTML = `<h4>${lastWorkout.date} - ${lastWorkout.category}</h4>`;
        if (!lastWorkout.exercises || lastWorkout.exercises.length === 0) {
            summaryHTML += '<p>No exercises were logged.</p>';
        } else {
            summaryHTML += '<table class="log-table"><tr><th>Exercise</th><th>Weight</th><th>Sets</th><th>Reps</th></tr>';
            lastWorkout.exercises.forEach(entry => {
                summaryHTML += `<tr><td>${entry.name}</td><td>${entry.weight}</td><td>${entry.sets}</td><td>${entry.reps}</td></tr>`;
            });
            summaryHTML += '</table>';
        }
        workoutSummaryContent.innerHTML = summaryHTML;
    };

    const renderFoodLogView = () => {
        const sortedDates = Object.keys(foodLogs).sort((a, b) => new Date(b) - new Date(a));
        if (!currentFoodLogDate) {
            currentFoodLogDate = foodLogs[getTodayDateString()] ? getTodayDateString() : (sortedDates[0] || null);
        }
        if (currentFoodLogDate && foodLogs[currentFoodLogDate]) {
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
        if (!items || items.length === 0) {
            foodLogEntries.innerHTML = '<p>No food logged for this day yet.</p>';
            return;
        }
        const groupedByMeal = items.reduce((acc, item) => {
            (acc[item.meal] = acc[item.meal] || []).push(item);
            return acc;
        }, {});
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
    const totals = (items || []).reduce((acc, item) => {
        acc.fat += Number(item.fat);
        acc.carbs += Number(item.carbs);
        acc.protein += Number(item.protein);
        acc.calories += Number(item.calories);
        return acc;
    }, { fat: 0, carbs: 0, protein: 0, calories: 0 });

    const goalCals = userGoals.calories || 0;
    if (goalCals > 0) {
        // --- THIS IS THE UPDATED PART for CALORIES ---
        const calClass = getMacroColorClass(totals.calories, goalCals);
        // We replace 'calories-consumed' with the dynamic class from our helper function
        calorieGoalProgress.innerHTML = `<span class="${calClass}">${totals.calories.toFixed(0)}</span> / ${goalCals.toFixed(0)} kcal`;
    } else {
        calorieGoalProgress.innerHTML = '';
    }

    const goalFat = userGoals.fat || 0;
    const goalCarbs = userGoals.carbs || 0;
    const goalProtein = userGoals.protein || 0;

    const fatClass = getMacroColorClass(totals.fat, goalFat);
    const carbsClass = getMacroColorClass(totals.carbs, goalCarbs);
    const proteinClass = getMacroColorClass(totals.protein, goalProtein);

    foodLogTotals.innerHTML = `
        <span class="macro-value">
            Fat: <span class="${fatClass}">${totals.fat.toFixed(1)}</span>/${goalFat.toFixed(0)}g
        </span> |
        <span class="macro-value">
            Carbs: <span class="${carbsClass}">${totals.carbs.toFixed(1)}</span>/${goalCarbs.toFixed(0)}g
        </span> |
        <span class="macro-value">
            Protein: <span class="${proteinClass}">${totals.protein.toFixed(1)}</span>/${goalProtein.toFixed(0)}g
        </span>
    `;

    renderPieChart(totals);
};

    const renderPieChart = (totals) => {
        const canvas = document.getElementById('macro-pie-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (macroChart) { macroChart.destroy(); }
        const totalCalories = totals.calories;
        if (totalCalories === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }
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
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') }
                    }
                }
            }
        });
    };

    const calculateAndRenderPRs = () => {
    const prs = {};
    // Step 1: Find the max weight for each exercise across all workouts. This part is correct.
    (workouts || []).forEach(workout => {
        (workout.exercises || []).forEach(entry => {
            const existingPr = prs[entry.name] || 0;
            const currentWeight = parseFloat(entry.weight);
            if (currentWeight > existingPr) {
                prs[entry.name] = currentWeight;
            }
        });
    });

    // --- THIS IS THE CORRECTED LOGIC ---
    // Step 2: Create a robust, case-insensitive lookup map for exercise categories.
    const exerciseCategoryMap = (exercises || []).reduce((map, ex) => {
        // Normalize the name (lowercase, no extra spaces) when creating the map
        map[ex.name.trim().toLowerCase()] = ex.category;
        return map;
    }, {});

    const groupedPRs = { Push: [], Pull: [], Legs: [], Other: [] };
    // Step 3: Group the found PRs using the robust lookup map.
    for (const exerciseName in prs) {
        // Normalize the name from the PR list before looking it up
        const normalizedName = exerciseName.trim().toLowerCase();
        const category = exerciseCategoryMap[normalizedName] || 'Other'; // Find category, default to 'Other' if not in the main list
        
        groupedPRs[category].push({ name: exerciseName, weight: prs[exerciseName] });
    }
    // --- END OF CORRECTION ---

    // Step 4: Render the correctly grouped PRs. This part is correct.
    prContainer.innerHTML = '';
    if (Object.keys(prs).length === 0) {
        prContainer.innerHTML = '<p>No personal records found. Log some workouts first!</p>';
        return;
    }
    CATEGORIES.forEach(category => {
        if (groupedPRs[category].length > 0) {
            groupedPRs[category].sort((a, b) => a.name.localeCompare(b.name));
            let tableHTML = `<div class="card"><h3>${category}</h3><table class="log-table"><tr><th>Exercise</th><th>Max Weight (lbs)</th></tr>`;
            groupedPRs[category].forEach(pr => {
                tableHTML += `<tr><td>${pr.name}</td><td>${pr.weight}</td></tr>`;
            });
            tableHTML += '</table></div>';
            prContainer.innerHTML += tableHTML;
        }
    });
};

    const renderProgressCharts = () => {
        const sortedFoodDates = Object.keys(foodLogs).sort((a, b) => new Date(a) - new Date(b));
        const foodLabels = sortedFoodDates;
        const calorieData = sortedFoodDates.map(date => (foodLogs[date].items || []).reduce((sum, item) => sum + item.calories, 0));
        const proteinData = sortedFoodDates.map(date => (foodLogs[date].items || []).reduce((sum, item) => sum + item.protein, 0));
        const weightEntries = (workouts || []).filter(w => w.bodyweight && w.bodyweight > 0).sort((a, b) => new Date(a.date) - new Date(b.date));
        const weightLabels = weightEntries.map(w => w.date);
        const weightData = weightEntries.map(w => w.bodyweight);
        const goalCalories = userGoals.calories || 0;
        const goalProtein = userGoals.protein || 0;
        const goalWeight = parseFloat(aboutGoalWeight.value) || 0;
        renderLineChart('calories-chart', caloriesChart, foodLabels, calorieData, 'Total Calories', 'rgba(255, 99, 132, 1)', goalCalories);
        renderLineChart('protein-chart', proteinChart, foodLabels, proteinData, 'Protein (g)', 'rgba(54, 162, 235, 1)', goalProtein);
        renderLineChart('weight-chart', weightChart, weightLabels, weightData, 'Body Weight (lbs)', 'rgba(75, 192, 192, 1)', goalWeight);
    };

    const renderLineChart = (canvasId, chartInstance, labels, data, label, color, goalValue) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (chartInstance) { chartInstance.destroy(); }
        const annotation = { annotations: { goalLine: { type: 'line', yMin: goalValue, yMax: goalValue, borderColor: 'rgba(100, 100, 100, 0.8)', borderWidth: 2, borderDash: [6, 6], label: { enabled: true, content: `Goal: ${goalValue.toFixed(0)}`, position: 'end', backgroundColor: 'rgba(100, 100, 100, 0.8)', font: { size: 10 } } } } };
        const chartPlugins = {
            legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } },
            zoom: { pan: { enabled: true, mode: 'xy' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' } },
            ...(goalValue > 0 && { annotation })
        };
        let newChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: color.replace('1)', '0.2)'), fill: true, tension: 0.1 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } }, y: { beginAtZero: false, ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } } },
                plugins: chartPlugins
            }
        });
        if (canvasId === 'calories-chart') caloriesChart = newChartInstance;
        if (canvasId === 'protein-chart') proteinChart = newChartInstance;
        if (canvasId === 'weight-chart') weightChart = newChartInstance;
    };

    const loadAboutMeData = () => {
        db.ref(`users/${currentUserId}/preferences/about`).once('value', (snapshot) => {
            const aboutData = snapshot.val();
            if (aboutData) {
                aboutSex.value = aboutData.sex || 'male';
                aboutAge.value = aboutData.age || '';
                aboutHeight.value = aboutData.height || '';
                aboutStartWeight.value = aboutData.startWeight || '';
                aboutGoalWeight.value = aboutData.goalWeight || '';
                aboutActivityLevel.value = aboutData.activityLevel || '1.55';
                calculateAndDisplayCalories();
                exitAboutMeEditMode();
            } else {
                enterAboutMeEditMode();
            }
        });
    };

    const calculateAndDisplayCalories = () => {
        const sex = aboutSex.value;
        const age = parseFloat(aboutAge.value);
        const heightIn = parseFloat(aboutHeight.value);
        const currentWeightLbs = parseFloat(aboutStartWeight.value);
        const goalWeightLbs = parseFloat(aboutGoalWeight.value);
        const activityMultiplier = parseFloat(aboutActivityLevel.value);

        if (!age || !heightIn || !currentWeightLbs || !goalWeightLbs) {
            calorieResultsContainer.innerHTML = `<p>Please fill out all fields to calculate your goals.</p>`;
            return;
        }

        const weightKg = currentWeightLbs * 0.453592;
        const heightCm = heightIn * 2.54;
        let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        bmr += (sex === 'male') ? 5 : -161;
        const tdee = bmr * activityMultiplier;
        let goalCalories = tdee;
        let goalType = "Maintain Weight";
        if (goalWeightLbs < currentWeightLbs) {
            goalType = "Lose Weight";
            goalCalories = tdee - 500;
        } else if (goalWeightLbs > currentWeightLbs) {
            goalType = "Gain Weight";
            goalCalories = tdee + 300;
        }

        const targetProtein = goalWeightLbs * 0.7;
        const targetFat = (goalCalories * 0.25) / 9;
        const targetCarbs = (goalCalories - (targetProtein * 4) - (targetFat * 9)) / 4;

        userGoals = { calories: goalCalories, protein: targetProtein, fat: targetFat, carbs: targetCarbs };
        
        calorieResultsContainer.innerHTML = `
            <p>Maintenance Calories: <strong>${tdee.toFixed(0)}</strong> kcal/day</p>
            <p>Your Goal (${goalType}): <strong>${goalCalories.toFixed(0)}</strong> kcal/day</p>
            <h4>Suggested Macros</h4>
            <p>Protein (0.7g/lb of goal weight): <strong>${targetProtein.toFixed(0)}g</strong></p>
            <p>Fat (25% of calories): <strong>${targetFat.toFixed(0)}g</strong></p>
            <p>Carbs (remaining calories): <strong>${targetCarbs.toFixed(0)}g</strong></p>`;
    };
    
    const enterAboutMeEditMode = () => {
        aboutMeForm.querySelectorAll('input, select').forEach(el => el.disabled = false);
        saveAboutMeBtn.style.display = 'inline-block';
        editAboutMeBtn.style.display = 'none';
    };

    const exitAboutMeEditMode = () => {
        aboutMeForm.querySelectorAll('input, select').forEach(el => el.disabled = true);
        saveAboutMeBtn.style.display = 'none';
        editAboutMeBtn.style.display = 'inline-block';
    };

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
        if (pin.length < 4) { authError.textContent = 'PIN must be at least 4 characters.'; return; }
        const userRef = db.ref('users/' + userId);
        userRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                authError.textContent = 'This name is already taken.';
            } else {
                const initialUserData = {
                    name: name,
                    pin: pin,
                    data: {
                        exercises: PREDEFINED_EXERCISES 
                    }
                };
                userRef.set(initialUserData).then(() => {
                    loadUserAndInitializeApp(userId, name);
                });
            }
        });
    });

    loginForm.addEventListener('submit', (e) => { e.preventDefault(); authError.textContent = ''; const name = document.getElementById('login-name').value; const pin = document.getElementById('login-pin').value; const userId = sanitizeNameForId(name); if (!userId) { authError.textContent = 'Please enter your name.'; return; } const userRef = db.ref('users/' + userId); userRef.once('value', (snapshot) => { if (snapshot.exists()) { const userData = snapshot.val(); if (userData.pin === pin) { loadUserAndInitializeApp(userId, userData.name); } else { authError.textContent = 'Incorrect PIN.'; } } else { authError.textContent = 'User not found.'; } }); });
    
    aboutMeForm.addEventListener('submit', (e) => { e.preventDefault(); const aboutData = { sex: aboutSex.value, age: aboutAge.value, height: aboutHeight.value, startWeight: aboutStartWeight.value, goalWeight: aboutGoalWeight.value, activityLevel: aboutActivityLevel.value, }; db.ref(`users/${currentUserId}/preferences/about`).set(aboutData).then(() => { alert('Your information has been saved!'); calculateAndDisplayCalories(); exitAboutMeEditMode(); db.ref(`users/${currentUserId}/preferences/goals`).set(userGoals); }); });
    
    editAboutMeBtn.addEventListener('click', () => { enterAboutMeEditMode(); });
    
    aboutMeForm.addEventListener('input', () => {
        if (saveAboutMeBtn.style.display === 'inline-block') {
            calculateAndDisplayCalories();
        }
    });

    addExerciseForm.addEventListener('submit', (e) => { e.preventDefault(); const name = newExerciseNameInput.value.trim(); const category = newExerciseCategorySelect.value; if (name) { (exercises || []).push({ id: Date.now(), name, category }); saveDataToFirebase(); renderExercises(); addExerciseForm.reset(); } });
    
    const exerciseListContainer = document.getElementById('exercise-list-layout'); // Make sure this is defined for the listener below
    exerciseListContainer.addEventListener('click', (e) => { const t = e.target.closest(".exercise-item"); if (!t) return; const n = Number(t.dataset.id); if (e.target.matches(".icon-btn.delete") && confirm("Are you sure?")) { exercises = (exercises || []).filter(e => e.id !== n); saveDataToFirebase(); renderExercises(); } if (e.target.matches(".icon-btn.edit")) { const e = (exercises || []).find(e => e.id === n); const t = prompt("Enter new name:", e.name); if (t && t.trim()) { e.name = t.trim(); saveDataToFirebase(); renderExercises(); } } });
    
    importCsvBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', (e) => handleCsvImport(e.target.files[0]));
    
    createWorkoutForm.addEventListener('submit', (e) => { e.preventDefault(); const date = workoutDateInput.value; const category = workoutCategorySelect.value; const bodyweight = parseFloat(workoutBodyweightInput.value) || null; if ((workouts || []).some(w => w.date === date)) { alert('A workout for this date already exists.'); return; } (workouts || []).push({ id: Date.now(), date, category, bodyweight, exercises: [], isFinished: false }); currentWorkoutIndex = 0; saveDataToFirebase(); renderWorkoutLogView(); createWorkoutForm.reset(); });
    editBodyweightBtn.addEventListener('click', () => { if (currentWorkoutIndex === -1) return; const workout = workouts[currentWorkoutIndex]; const newBodyweight = prompt('Enter new body weight (lbs):', workout.bodyweight || ''); if (newBodyweight === null) return; const newBwValue = parseFloat(newBodyweight); workout.bodyweight = !isNaN(newBwValue) ? newBwValue : null; saveDataToFirebase(); renderWorkoutLogView(); });
    prevWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex < (workouts || []).length - 1) { currentWorkoutIndex++; renderWorkoutLogView(); } });
    nextWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex > 0) { currentWorkoutIndex--; renderWorkoutLogView(); } });
    deleteWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex === -1) return; if (confirm("Are you sure?")) { workouts.splice(currentWorkoutIndex, 1); saveDataToFirebase(); currentWorkoutIndex = -1; renderWorkoutLogView(); } });
    
    searchExerciseInput.addEventListener('input', () => { const query = searchExerciseInput.value.toLowerCase(); searchResultsContainer.innerHTML = ''; if (query.length < 1) return; const filtered = (exercises || []).filter(ex => ex.name.toLowerCase().includes(query)); filtered.forEach(ex => { const item = document.createElement('div'); item.className = 'search-result-item'; item.textContent = ex.name; item.addEventListener('click', () => { searchExerciseInput.value = ex.name; searchResultsContainer.innerHTML = ''; }); searchResultsContainer.appendChild(item); }); });
    
    addLogEntryForm.addEventListener('submit', (e) => { e.preventDefault(); const workout = workouts[currentWorkoutIndex]; if (!workout) return; const newEntry = { id: Date.now(), name: searchExerciseInput.value, weight: logWeightInput.value || 0, sets: logSetsInput.value || 0, reps: logRepsInput.value || 0 }; if (!newEntry.name || !(exercises || []).some(ex => ex.name === newEntry.name)) { alert('Please select a valid exercise from the list.'); return; } (workout.exercises = workout.exercises || []).push(newEntry); saveDataToFirebase(); renderWorkoutLogView(); addLogEntryForm.reset(); });
    
    workoutLogEntries.addEventListener('click', (e) => {
        const entryRow = e.target.closest("tr");
        if (!entryRow || currentWorkoutIndex === -1) return;
    
        const entryId = Number(entryRow.dataset.entryId);
        const workout = workouts[currentWorkoutIndex];
        const entryIndex = (workout.exercises || []).findIndex(ex => ex.id === entryId);
    
        if (e.target.matches('.icon-btn.edit')) {
            editingEntryId = entryId;
            renderWorkoutLogView();
            return;
        }
    
        if (e.target.matches('.icon-btn.delete')) {
            if (confirm("Delete this entry?")) {
                workout.exercises.splice(entryIndex, 1);
                saveDataToFirebase();
                renderWorkoutLogView();
            }
            return;
        }
        
        if (e.target.matches('.icon-btn.save')) {
            const nameInput = entryRow.querySelector('.edit-exercise-name');
            const weightInput = entryRow.querySelector('.edit-weight');
            const setsInput = entryRow.querySelector('.edit-sets');
            const repsInput = entryRow.querySelector('.edit-reps');
    
            if (entryIndex !== -1) {
                workout.exercises[entryIndex].name = nameInput.value;
                workout.exercises[entryIndex].weight = weightInput.value || 0;
                workout.exercises[entryIndex].sets = setsInput.value || 0;
                workout.exercises[entryIndex].reps = repsInput.value || 0;
            }
    
            editingEntryId = null;
            saveDataToFirebase();
            renderWorkoutLogView();
            return;
        }
        
        if (e.target.matches('.icon-btn.cancel')) {
            editingEntryId = null;
            renderWorkoutLogView();
            return;
        }
    });
    
    workoutLogEntries.addEventListener('input', (e) => {
        if (!e.target.matches('.edit-exercise-name')) return;
    
        const query = e.target.value.toLowerCase();
        const resultsContainer = e.target.nextElementSibling;
        resultsContainer.innerHTML = '';
    
        if (query.length < 1) return;
    
        const filtered = (exercises || []).filter(ex => ex.name.toLowerCase().includes(query));
        filtered.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.textContent = ex.name;
            item.addEventListener('click', () => {
                e.target.value = ex.name;
                resultsContainer.innerHTML = '';
            });
            resultsContainer.appendChild(item);
        });
    });

    summaryCategorySelect.addEventListener('change', () => { renderSummaryView(summaryCategorySelect.value); });
    finishWorkoutBtn.addEventListener('click', () => { const workout = workouts[currentWorkoutIndex]; if (!workout) return; workout.isFinished = true; saveDataToFirebase(); renderWorkoutLogView(); });
    editWorkoutBtn.addEventListener('click', () => { const workout = workouts[currentWorkoutIndex]; if (!workout) return; workout.isFinished = false; saveDataToFirebase(); renderWorkoutLogView(); });
    
    createFoodLogForm.addEventListener('submit', (e) => { e.preventDefault(); const date = foodLogDateInput.value; if (!foodLogs[date]) { foodLogs[date] = { items: [], isFinished: false }; } currentFoodLogDate = date; saveDataToFirebase(); renderFoodLogView(); });
    prevFoodLogBtn.addEventListener('click', () => { const sortedDates = Object.keys(foodLogs).sort((a, b) => new Date(b) - new Date(a)); const currentIndex = sortedDates.indexOf(currentFoodLogDate); if (currentIndex < sortedDates.length - 1) { currentFoodLogDate = sortedDates[currentIndex + 1]; renderFoodLogView(); } });
    nextFoodLogBtn.addEventListener('click', () => { const sortedDates = Object.keys(foodLogs).sort((a, b) => new Date(b) - new Date(a)); const currentIndex = sortedDates.indexOf(currentFoodLogDate); if (currentIndex > 0) { currentFoodLogDate = sortedDates[currentIndex - 1]; renderFoodLogView(); } });
    deleteFoodLogBtn.addEventListener('click', () => { if (!currentFoodLogDate) return; if (confirm("Delete this day's food log?")) { delete foodLogs[currentFoodLogDate]; saveDataToFirebase(); currentFoodLogDate = null; renderFoodLogView(); } });
    finishFoodLogBtn.addEventListener('click', () => { const log = foodLogs[currentFoodLogDate]; if (log) { log.isFinished = true; saveDataToFirebase(); renderFoodLogView(); } });
    editFoodLogBtn.addEventListener('click', () => { const log = foodLogs[currentFoodLogDate]; if (log) { log.isFinished = false; saveDataToFirebase(); renderFoodLogView(); } });
    
    foodLogEntries.addEventListener('click', (e) => { const target = e.target; const entryRow = target.closest('tr'); if (!entryRow || !currentFoodLogDate) return; const entryId = Number(entryRow.dataset.entryId); const log = foodLogs[currentFoodLogDate]; const entryIndex = (log.items || []).findIndex(item => item.id === entryId); if (entryIndex === -1) return; if (target.matches('.icon-btn.delete')) { if (confirm('Delete food entry?')) { log.items.splice(entryIndex, 1); saveDataToFirebase(); renderFoodLogView(); } } if (target.matches('.icon-btn.edit')) { const item = log.items[entryIndex]; const newName = prompt('New food name:', item.name); const newFat = prompt('New fat (g):', item.fat); const newCarbs = prompt('New carbs (g):', item.carbs); const newProtein = prompt('New protein (g):', item.protein); if (newName !== null) item.name = newName; if (newFat !== null) item.fat = parseFloat(newFat) || 0; if (newCarbs !== null) item.carbs = parseFloat(newCarbs) || 0; if (newProtein !== null) item.protein = parseFloat(newProtein) || 0; item.calories = (item.fat * 9) + (item.carbs * 4) + (item.protein * 4); saveDataToFirebase(); renderFoodLogView(); } });
    
    myProgressTab.addEventListener('click', (e) => { if (e.target.matches('.reset-zoom-btn')) { const chartId = e.target.dataset.chartId; if (chartId === 'calories-chart' && caloriesChart) { caloriesChart.resetZoom(); } else if (chartId === 'protein-chart' && proteinChart) { proteinChart.resetZoom(); } else if (chartId === 'weight-chart' && weightChart) { weightChart.resetZoom(); } } });

    foodItemNameInput.addEventListener('input', () => {
        const query = foodItemNameInput.value.toLowerCase();
        foodSearchResultsContainer.innerHTML = '';
        foodMacroDetails.style.display = 'none';

        if (query.length < 2) return;

        let localResultsHTML = '';
        const filteredLocal = (uniqueFoods || []).filter(food => food.name.toLowerCase().includes(query));

        if (filteredLocal.length > 0) {
            localResultsHTML += '<h6 class="search-results-header">My Foods</h6>';
            filteredLocal.forEach(food => {
                localResultsHTML += `
                    <div class="search-result-item" data-food-type="local" data-food-name="${food.name}">
                        <span>${food.name}</span>
                        <button class="icon-btn delete" title="Delete Saved Food" data-food-name-delete="${food.name}">&#128465;</button>
                    </div>`;
            });
        }
        foodSearchResultsContainer.innerHTML = localResultsHTML;
        foodSearchResultsContainer.innerHTML += `<div id="usda-search-loader" class="search-meta-info"><p>Searching USDA database...</p></div>`;
        debouncedUsdaSearch(query);
    });

    foodSearchResultsContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.icon-btn.delete');
        if (deleteBtn) {
            e.stopPropagation();
            const foodNameToDelete = deleteBtn.dataset.foodNameDelete;
            if (confirm(`Are you sure you want to permanently delete "${foodNameToDelete}" from your saved foods?`)) {
                uniqueFoods = uniqueFoods.filter(food => food.name !== foodNameToDelete);
                saveDataToFirebase();
                foodItemNameInput.dispatchEvent(new Event('input'));
            }
            return;
        }

        const resultItem = e.target.closest('.search-result-item');
        if (!resultItem) return;

        const { foodType, foodName, baseFat, baseCarbs, baseProtein } = resultItem.dataset;
        
        addFoodItemForm.dataset.baseFat = baseFat || 0;
        addFoodItemForm.dataset.baseCarbs = baseCarbs || 0;
        addFoodItemForm.dataset.baseProtein = baseProtein || 0;
        addFoodItemForm.dataset.foodName = foodName;
        addFoodItemForm.dataset.foodType = foodType;

        if (foodType === 'local') {
            const food = uniqueFoods.find(f => f.name === foodName);
            if (food) {
                addFoodItemForm.dataset.baseFat = food.fat;
                addFoodItemForm.dataset.baseCarbs = food.carbs;
                addFoodItemForm.dataset.baseProtein = food.protein;
                foodItemNameInput.value = food.name;
                foodItemUnitSelect.innerHTML = `<option value="serving">serving</option>`;
                foodItemQuantityInput.value = 1;
            }
        } else if (foodType === 'usda') {
            foodItemNameInput.value = foodName;
            foodItemUnitSelect.innerHTML = `<option value="g">g</option>`;
            foodItemQuantityInput.value = 100;
        }
        
        foodMacroDetails.style.display = 'flex';
        foodSearchResultsContainer.innerHTML = '';
        foodItemQuantityInput.dispatchEvent(new Event('input'));
    });

    const handleMacroRecalculation = () => {
        const { baseFat, baseCarbs, baseProtein, foodType } = addFoodItemForm.dataset;
        const quantity = parseFloat(foodItemQuantityInput.value) || 0;
        
        let multiplier = 1;
        if (foodType === 'usda') {
            multiplier = quantity / 100;
        } else {
            multiplier = quantity;
        }

        foodItemFatInput.value = (baseFat * multiplier).toFixed(1);
        foodItemCarbsInput.value = (baseCarbs * multiplier).toFixed(1);
        foodItemProteinInput.value = (baseProtein * multiplier).toFixed(1);
    };

    foodItemQuantityInput.addEventListener('input', handleMacroRecalculation);
    foodItemUnitSelect.addEventListener('change', handleMacroRecalculation);

    addFoodItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentFoodLogDate) return;

        const displayName = foodItemNameInput.value.trim();
        if (!displayName || foodMacroDetails.style.display === 'none') {
            alert("Please search for and select a food first.");
            return;
        }
        
        const fat = parseFloat(foodItemFatInput.value) || 0;
        const carbs = parseFloat(foodItemCarbsInput.value) || 0;
        const protein = parseFloat(foodItemProteinInput.value) || 0;

        const newItem = {
            id: Date.now(),
            name: `${displayName} (${foodItemQuantityInput.value} ${foodItemUnitSelect.value})`,
            meal: foodItemMealSelect.value,
            fat, carbs, protein,
            calories: (fat * 9) + (carbs * 4) + (protein * 4)
        };

        (foodLogs[currentFoodLogDate].items = foodLogs[currentFoodLogDate].items || []).push(newItem);

        const canonicalName = addFoodItemForm.dataset.foodName;
        const isNewUnique = !(uniqueFoods || []).some(food => food.name.toLowerCase() === canonicalName.toLowerCase());
        if (addFoodItemForm.dataset.foodType === 'usda' && isNewUnique) {
            (uniqueFoods || []).push({
                name: canonicalName,
                fat: parseFloat(addFoodItemForm.dataset.baseFat),
                carbs: parseFloat(addFoodItemForm.dataset.baseCarbs),
                protein: parseFloat(addFoodItemForm.dataset.baseProtein)
            });
        }
        
        saveDataToFirebase();
        renderFoodLogView();
        
        addFoodItemForm.reset();
        foodMacroDetails.style.display = 'none';
        foodItemNameInput.focus();
    });

    foodItemNameInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (!foodSearchResultsContainer.matches(':hover')) {
                foodSearchResultsContainer.innerHTML = '';
            }
        }, 200);
    });

    // --- Initialization ---
    const initializeApp = () => {
        loadTheme();
        let categoryOptions = '';
        CATEGORIES.forEach(cat => categoryOptions += `<option value="${cat}">${cat}</option>`);
        if (workoutCategorySelect) workoutCategorySelect.innerHTML = categoryOptions;
        if (summaryCategorySelect) summaryCategorySelect.innerHTML = categoryOptions;
        if (newExerciseCategorySelect) newExerciseCategorySelect.innerHTML = categoryOptions;

        if (foodLogDateInput) foodLogDateInput.value = getTodayDateString();
        if (workoutDateInput) workoutDateInput.value = getTodayDateString();
        
        if (foodMacroDetails) foodMacroDetails.style.display = 'none';

        const rememberedUser = JSON.parse(localStorage.getItem('freilifts_loggedInUser'));
        if (rememberedUser) {
            loadUserAndInitializeApp(rememberedUser.id, rememberedUser.name);
        } else {
            showAuth();
        }
    };
    initializeApp();
});
