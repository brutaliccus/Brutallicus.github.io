function createProfileModule() {
    // --- 1. MODULE SCOPE VARIABLES & DOM REFERENCES ---
    let db, getState, saveDataToFirebase, calculateCurrentGoals, formatDate, calculateE1RM;

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
    const resetWeightHistoryBtn = document.getElementById('reset-weight-history-btn');

    const CATEGORIES = ['Push', 'Pull', 'Legs', 'Other'];


    // --- 2. CORE FUNCTIONS ---

    function calculateAndRenderPRs() {
        const prs = {};
        const { workouts, exercises } = getState();

        // 1. Iterate through all workouts to find the best lift and best e1RM for each exercise.
        workouts.forEach(workout => {
            (workout.exercises || []).forEach(entry => {
                if (!prs[entry.name]) {
                    prs[entry.name] = { name: entry.name, heavyLift: 0, bestE1RM: 0 };
                }
                const weight = parseFloat(entry.weight);
                const reps = parseInt(entry.reps, 10);

                if (weight > prs[entry.name].heavyLift) {
                    prs[entry.name].heavyLift = weight;
                }

                const currentE1RM = calculateE1RM(weight, reps);
                if (currentE1RM > prs[entry.name].bestE1RM) {
                    prs[entry.name].bestE1RM = currentE1RM;
                }
            });
        });

        // 2. Group the calculated PRs by category
        const exerciseCategoryMap = exercises.reduce((map, ex) => {
            map[ex.name.trim().toLowerCase()] = ex.category;
            return map;
        }, {});

        const groupedPRs = { Push: [], Pull: [], Legs: [], Other: [] };
        for (const exerciseName in prs) {
            const category = exerciseCategoryMap[exerciseName.trim().toLowerCase()] || 'Other';
            groupedPRs[category].push(prs[exerciseName]);
        }

        // 3. Render the new PR cards
        prContainer.innerHTML = '';
        let hasPRs = false;

        CATEGORIES.forEach(category => {
            const categoryPRs = groupedPRs[category];
            if (categoryPRs.length > 0) {
                hasPRs = true;
                categoryPRs.sort((a, b) => a.name.localeCompare(b.name));

                // This section generates the HTML with the necessary classes for styling
                const categoryHtml = categoryPRs.map(pr => `
                    <div class="card">
                        <h4>${pr.name}</h4>
                        <div class="pr-card-metrics">
                            <div class="pr-metric metric-heavy-lift">
                                <span class="pr-metric-value">${pr.heavyLift.toFixed(1)} lbs</span>
                                <span class="pr-metric-label">Heaviest Lift</span>
                            </div>
                            <div class="pr-metric metric-e1rm">
                                <span class="pr-metric-value">${pr.bestE1RM.toFixed(1)} lbs</span>
                                <span class="pr-metric-label">Est. 1-Rep Max</span>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                prContainer.innerHTML += `
                    <div class="pr-category-group">
                        <h2>${category}</h2>
                        <div class="pr-layout">${categoryHtml}</div>
                    </div>
                `;
            }
        });

        if (!hasPRs) {
            prContainer.innerHTML = '<p>No personal records found. Go lift some weights!</p>';
        }
    }

    /**
     * Calculates and displays the user's calorie and macro goals.
     */
    function calculateAndDisplayCalories() {
        const { goals, weightUsed, maintenance } = calculateCurrentGoals();
        let goalType = "Maintain Weight";
        const goalWeight = parseFloat(aboutGoalWeight.value) || 0;

        if (goalWeight > 0 && weightUsed > 0) {
            if (goalWeight < weightUsed) goalType = "Lose Weight";
            else if (goalWeight > weightUsed) goalType = "Gain Weight";
        }

        if (weightUsed === 0) {
             calorieResultsContainer.innerHTML = `<p>Fill out and save your information to calculate your goals.</p>`;
             return;
        }

        calorieResultsContainer.innerHTML = `
            <p style="font-size: 0.9em; color: var(--secondary-color);">Calculating based on current weight: <strong>${weightUsed.toFixed(1)} lbs</strong></p>
            <p>Maintenance Calories: <strong>${maintenance.toFixed(0)}</strong> kcal/day</p>
            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;">
            <h4>Goal: ${goalType}</h4>
            <p>Target Calories: <strong>${goals.calories.toFixed(0)}</strong> kcal/day</p>
            <p>Protein: <strong>${goals.protein.toFixed(0)}g</strong></p>
            <p>Fat: <strong>${goals.fat.toFixed(0)}g</strong></p>
            <p>Carbs: <strong>${goals.carbs.toFixed(0)}g</strong></p>`;
    }

    /**
     * Puts the 'About Me' form into an editable state.
     */
    function enterAboutMeEditMode() {
        aboutMeForm.querySelectorAll('input, select').forEach(el => el.disabled = false);
        saveAboutMeBtn.style.display = 'inline-block';
        editAboutMeBtn.style.display = 'none';
    }

    /**
     * Puts the 'About Me' form into a read-only state.
     */
    function exitAboutMeEditMode() {
        aboutMeForm.querySelectorAll('input, select').forEach(el => el.disabled = true);
        saveAboutMeBtn.style.display = 'none';
        editAboutMeBtn.style.display = 'inline-block';
    }

    /**
     * Loads user profile data into the 'About Me' form.
     */
    function loadAboutMeData() {
        const aboutData = getState().about;
        if (aboutData && aboutData.age) {
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
    }


    // --- 3. EVENT BINDING ---

    /**
     * Binds all event listeners for this module.
     */
    function bindEvents() {
        resetWeightHistoryBtn.addEventListener('click', () => {
            if (confirm("Are you sure? This will make the app ignore all past bodyweight entries for goal calculations. Your current 'About Me' weight will become the new baseline.")) {
                const resetDate = new Date().toISOString();
                getState().about.bodyweightResetDate = resetDate;
                db.ref(`users/${getState().currentUserId}/preferences/bodyweightResetDate`).set(resetDate)
                    .then(() => {
                        calculateAndDisplayCalories();
                        alert("Weight history has been reset. Your goals have been updated.");
                    })
                    .catch(error => {
                        console.error("Failed to save reset date:", error);
                        alert("An error occurred. Please try again.");
                    });
            }
        });

        aboutMeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const aboutData = {
                sex: aboutSex.value, age: aboutAge.value, height: aboutHeight.value,
                startWeight: aboutStartWeight.value, goalWeight: aboutGoalWeight.value, activityLevel: aboutActivityLevel.value,
            };
            getState().about = {...getState().about, ...aboutData};
            db.ref(`users/${getState().currentUserId}/preferences/about`).set(aboutData).then(() => {
                calculateAndDisplayCalories();
                db.ref(`users/${getState().currentUserId}/preferences/goals`).set(getState().userGoals).then(() => {
                    alert('Your information and goals have been saved!');
                    exitAboutMeEditMode();
                });
            });
        });

        editAboutMeBtn.addEventListener('click', enterAboutMeEditMode);

        // Real-time calculation as user types in edit mode
        aboutMeForm.addEventListener('input', () => {
            if (saveAboutMeBtn.style.display === 'inline-block') {
                getState().about = {
                    ...getState().about,
                    sex: aboutSex.value, age: aboutAge.value, height: aboutHeight.value,
                    startWeight: aboutStartWeight.value, goalWeight: aboutGoalWeight.value, activityLevel: aboutActivityLevel.value,
                };
                calculateAndDisplayCalories();
            }
        });
    }


    // --- 4. INITIALIZATION ---
    
    /**
     * Initializes the module by receiving the API object.
     * @param {object} api - The module API from app.js.
     */
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        calculateCurrentGoals = api.calculateCurrentGoals;
        formatDate = api.formatDate;
        calculateE1RM = api.calculateE1RM; // Grab the new function from the API
        bindEvents();
    }

    // Expose public functions
    return {
        init,
        renderPRs: calculateAndRenderPRs,
        renderAboutMe: loadAboutMeData
    };
}
