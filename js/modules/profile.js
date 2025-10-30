// js/modules/profile.js (V3 - Corrected PR Logic for New Data Model - UNTRUNCATED)
function createProfileModule() {
    // --- 1. MODULE SCOPE & REFERENCES ---
    let db, getState, saveDataToFirebase, calculateCurrentGoals, formatDate, calculateE1RM, showConfirmation;
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

    // --- 2. HELPER FUNCTIONS ---

    // A copy of the migration function is needed here to read old data formats correctly.
    function migrateExerciseData(exercises) {
        if (!exercises || !Array.isArray(exercises) || exercises.length === 0) return [];
        const firstValidItem = exercises.find(ex => ex);
        if (!firstValidItem || Array.isArray(firstValidItem.sets)) {
            return exercises; // Already new format or is empty/invalid
        }
        const map = new Map();
        exercises.forEach(old => {
            if(!old.name) return;
            if(!map.has(old.name)) {
                map.set(old.name, { 
                    id: old.id || Date.now() + Math.random(), 
                    name: old.name, 
                    isEditing: false, 
                    sets:[] 
                });
            }
            const ex = map.get(old.name);
            const numSets = parseInt(old.sets, 10) || 1;
            for(let i=0; i < numSets; i++) {
                ex.sets.push({
                    id: Date.now() + Math.random(), 
                    weight: old.weight || '', 
                    reps: old.reps || ''
                });
            }
        });
        return Array.from(map.values());
    }

    // --- 3. CORE FUNCTIONS ---

    /**
     * REWRITTEN: Calculates and renders PRs, now compatible with the new set-based
     * data model and grouping by primary muscle.
     */
    function calculateAndRenderPRs() {
        const prs = {};
        const allWorkouts = getState().workouts;
        const masterExerciseList = getState().exercises;

        // 1. Loop through all workouts and all sets to find the best numbers.
        allWorkouts.forEach(workout => {
            const exercisesInWorkout = migrateExerciseData(workout.exercises);

            exercisesInWorkout.forEach(exercise => {
                if (!exercise.name) return;

                (exercise.sets || []).forEach(set => {
                    if (!prs[exercise.name]) {
                        prs[exercise.name] = { name: exercise.name, heavyLift: 0, bestE1RM: 0 };
                    }

                    const weight = parseFloat(set.weight) || 0;
                    const reps = parseInt(set.reps, 10) || 0;

                    if (weight > prs[exercise.name].heavyLift) {
                        prs[exercise.name].heavyLift = weight;
                    }

                    const currentE1RM = calculateE1RM(weight, reps);
                    if (currentE1RM > prs[exercise.name].bestE1RM) {
                        prs[exercise.name].bestE1RM = currentE1RM;
                    }
                });
            });
        });
        
        // 2. Group the calculated PRs by primary muscle from the master exercise list.
        const exerciseMuscleMap = masterExerciseList.reduce((map, ex) => {
            map[ex.name.toLowerCase()] = ex.primaryMuscle || 'Uncategorized';
            return map;
        }, {});
        
        const groupedPRs = {};
        const allMuscles = [...new Set(masterExerciseList.map(ex => ex.primaryMuscle || 'Uncategorized'))];
        allMuscles.forEach(m => { groupedPRs[m] = []; });

        for (const exerciseName in prs) {
            const muscleGroup = exerciseMuscleMap[exerciseName.toLowerCase()] || 'Uncategorized';
            if (groupedPRs[muscleGroup]) {
                groupedPRs[muscleGroup].push(prs[exerciseName]);
            } else {
                if (!groupedPRs['Uncategorized']) groupedPRs['Uncategorized'] = [];
                groupedPRs['Uncategorized'].push(prs[exerciseName]);
            }
        }
        
        // 3. Render the PR cards, grouped by muscle.
        prContainer.innerHTML = '';
        let hasPRs = false;
        const sortedGroups = Object.keys(groupedPRs).sort((a,b) => {
            if (a === 'Uncategorized') return 1; // Always sort 'Uncategorized' to the end
            if (b === 'Uncategorized') return -1;
            return a.localeCompare(b);
        });

        sortedGroups.forEach(muscleGroup => {
            const groupPRs = groupedPRs[muscleGroup];
            if (groupPRs && groupPRs.length > 0) {
                hasPRs = true;
                groupPRs.sort((a, b) => a.name.localeCompare(b.name));
                const cardsHTML = groupPRs.map(pr => `
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
                        <h2>${muscleGroup}</h2>
                        <div class="pr-layout">${cardsHTML}</div>
                    </div>
                `;
            }
        });

        if (!hasPRs) {
            prContainer.innerHTML = '<p>No personal records found. Go lift some weights!</p>';
        }
    }
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

    function enterAboutMeEditMode() {
        aboutMeForm.querySelectorAll('input, select').forEach(el => el.disabled = false);
        saveAboutMeBtn.style.display = 'inline-block';
        editAboutMeBtn.style.display = 'none';
    }

    function exitAboutMeEditMode() {
        aboutMeForm.querySelectorAll('input, select').forEach(el => el.disabled = true);
        saveAboutMeBtn.style.display = 'none';
        editAboutMeBtn.style.display = 'inline-block';
    }

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

    // --- 4. EVENT BINDING ---
    function bindEvents() {
        resetWeightHistoryBtn.addEventListener('click', async () => {
            const confirmed = await showConfirmation("Are you sure? This will make the app ignore all past bodyweight entries for goal calculations.", "Reset Weight History");
            if (confirmed) {
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

    // --- 5. INITIALIZATION ---
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        calculateCurrentGoals = api.calculateCurrentGoals;
        formatDate = api.formatDate;
        calculateE1RM = api.calculateE1RM;
        showConfirmation = api.showConfirmation; 
        bindEvents();
    }

    // Expose public functions
    return {
        init,
        renderPRs: calculateAndRenderPRs,
        renderAboutMe: loadAboutMeData
    };
}