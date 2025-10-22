function createProfileModule() {
    let db, getState, saveDataToFirebase, calculateCurrentGoals;

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

    function calculateAndRenderPRs() {
        const prs = {};
        getState().workouts.forEach(workout => {
            (workout.exercises || []).forEach(entry => {
                const existingPr = prs[entry.name] || 0;
                if (parseFloat(entry.weight) > existingPr) {
                    prs[entry.name] = parseFloat(entry.weight);
                }
            });
        });
        const exerciseCategoryMap = getState().exercises.reduce((map, ex) => {
            map[ex.name.trim().toLowerCase()] = ex.category;
            return map;
        }, {});
        const groupedPRs = { Push: [], Pull: [], Legs: [], Other: [] };
        for (const exerciseName in prs) {
            const category = exerciseCategoryMap[exerciseName.trim().toLowerCase()] || 'Other';
            groupedPRs[category].push({ name: exerciseName, weight: prs[exerciseName] });
        }
        prContainer.innerHTML = '';
        if (Object.keys(prs).length === 0) {
            prContainer.innerHTML = '<p>No personal records found.</p>';
            return;
        }
        CATEGORIES.forEach(category => {
            if (groupedPRs[category].length > 0) {
                groupedPRs[category].sort((a, b) => a.name.localeCompare(b.name));
                let tableHTML = `<div class="card"><h3>${category}</h3><table class="log-table"><tr><th>Exercise</th><th>Max Weight (lbs)</th></tr>`;
                groupedPRs[category].forEach(pr => { tableHTML += `<tr><td>${pr.name}</td><td>${pr.weight}</td></tr>`; });
                tableHTML += '</table></div>';
                prContainer.innerHTML += tableHTML;
            }
        });
    }

    function calculateAndDisplayCalories() {
        const { goals, weightUsed, maintenance } = calculateCurrentGoals();
        let goalType = "Maintain Weight";
        const goalWeight = parseFloat(aboutGoalWeight.value) || 0;
        if (goalWeight > 0) {
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
            <p>Your Goal (${goalType}): <strong>${goals.calories.toFixed(0)}</strong> kcal/day</p>
            <h4>Suggested Macros</h4>
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
        aboutMeForm.addEventListener('input', () => {
            if (saveAboutMeBtn.style.display === 'inline-block') {
                getState().about = {
                    sex: aboutSex.value, age: aboutAge.value, height: aboutHeight.value,
                    startWeight: aboutStartWeight.value, goalWeight: aboutGoalWeight.value, activityLevel: aboutActivityLevel.value,
                };
                calculateAndDisplayCalories();
            }
        });
    }

    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        calculateCurrentGoals = api.calculateCurrentGoals;
        bindEvents();
    }

    return {
        init,
        renderPRs: calculateAndRenderPRs,
        renderAboutMe: loadAboutMeData
    };
}