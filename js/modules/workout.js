// js/modules/workout.js (V19 - DOM Initialization Fix)
function createWorkoutModule() {
    // --- 1. MODULE SCOPE & REFERENCES ---
    let db, getState, saveDataToFirebase, getTodayDateString, formatDate, showConfirmation;
    let sharingModule;
    let currentWorkoutId = null,
        selectedDate = null,
        calendarViewDate = new Date();
    let workoutTimerInterval = null,
        restTimerInterval = null,
        activeRestTimer = { setId: null, startTime: 0 },
        activeExerciseInput = null;
        
    // DOM Elements - We will DECLARE them here, but ASSIGN them inside init()
    let workoutBodyweightInput, workoutCategorySelect, startWorkoutBtn, currentWorkoutSection,
        workoutTitle, prevWorkoutBtn, nextWorkoutBtn, workoutLogEntries, exerciseSearchResults,
        finishWorkoutBtn, summaryCategorySelect, workoutSummaryContent, calendarMonthYear,
        calendarDaysGrid, calendarPrevWeekBtn, calendarNextWeekBtn, workoutTimerDisplay,
        bodyweightValue, bodyweightDisplayContainer, editBodyweightBtn;

    const CATEGORIES = ['Push', 'Pull', 'Legs', 'Upper Body', 'Lower Body', 'Full Body', 'Other'];

    // --- 2. HELPER & UTILITY ---
    const toLocalISOString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const formatDuration = (ms) => { if (!ms || ms < 0) return '00:00:00'; const totalSeconds = Math.floor(ms / 1000); const h = Math.floor(totalSeconds / 3600), m = Math.floor((totalSeconds % 3600) / 60), s = totalSeconds % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
    const startTimerDisplay = (startTime) => { if (workoutTimerInterval) clearInterval(workoutTimerInterval); workoutTimerDisplay.style.display = 'inline-flex'; workoutTimerInterval = setInterval(() => { workoutTimerDisplay.querySelector('span').textContent = formatDuration(Date.now() - startTime); }, 1000); };
    const formatRestTime = (ms) => { if (!ms || ms < 0) return '00:00'; const totalSeconds = Math.floor(ms / 1000); const m = Math.floor(totalSeconds / 60), s = totalSeconds % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
    
    function createSetsSummaryString(sets) {
    if (!Array.isArray(sets) || sets.length === 0) return 'No sets logged';

    // REMOVED: const workingSets = sets.filter(...)

    const summaryParts = [];
    // Iterate over ALL sets, not just working sets
    sets.forEach(set => {
        if (!set || !Array.isArray(set.drops)) return;
        
        // Create the base summary from the drops
        const dropsSummary = set.drops.map(d => `${d.reps || 0} x ${d.weight || 0}lbs`).join(' &rarr; ');
        
        // If it's a warmup set, append the label
        if (set.isWarmup) {
            summaryParts.push(`${dropsSummary} (warm-up)`);
        } else {
            summaryParts.push(dropsSummary);
        }
    });

    if (summaryParts.length === 0) return 'No sets logged';

    // The rest of the grouping logic remains the same.
    // It will now correctly group "100lbs x 5 reps" and "100lbs x 5 reps (warm-up)" separately.
    const setGroups = new Map();
    summaryParts.forEach(summary => { setGroups.set(summary, (setGroups.get(summary) || 0) + 1); });
    
    const finalSummary = [];
    for (const [summary, count] of setGroups.entries()) { 
        finalSummary.push(`${count > 1 ? count + ' sets of ' : ''}${summary}`); 
    }
    
    // Sort the summary to put warm-ups first, which is visually logical
    finalSummary.sort((a, b) => {
        const aIsWarmup = a.includes('(warm-up)');
        const bIsWarmup = b.includes('(warm-up)');
        if (aIsWarmup && !bIsWarmup) return -1; // a comes first
        if (!aIsWarmup && bIsWarmup) return 1;  // b comes first
        return 0; // maintain original order otherwise
    });

    return finalSummary.join('<br>');
}

    // --- 3. DATA MIGRATION & SANITIZATION ---
    function migrateExerciseData(exercises) {
        if (!Array.isArray(exercises)) return [];
        return exercises.map(exercise => {
            if (!exercise) return null;
            if (exercise.type) {
                exercise.subExercises = Array.isArray(exercise.subExercises) ? exercise.subExercises : [];
                exercise.subExercises.forEach(sub => {
                    if (sub) {
                       sub.sets = Array.isArray(sub.sets) ? sub.sets : [];
                       sub.sets.forEach(set => {
                           if(set) { set.drops = Array.isArray(set.drops) ? set.drops : []; }
                       });
                    }
                });
                return exercise;
            }
            if (typeof exercise.name === 'string' && typeof exercise.sets !== 'undefined') {
                return {
                    id: exercise.id || Date.now() + Math.random(), type: 'single', isEditing: exercise.isEditing || false,
                    subExercises: [{
                        id: exercise.id || Date.now() + Math.random(), name: exercise.name,
                        sets: (Array.isArray(exercise.sets) ? exercise.sets : []).map(oldSet => ({
                            id: oldSet ? oldSet.id || Date.now() + Math.random() : Date.now() + Math.random(), isWarmup: false,
                            drops: [{ weight: oldSet ? oldSet.weight || '' : '', reps: oldSet ? oldSet.reps || '' : '' }]
                        }))
                    }]
                };
            }
            return null;
        }).filter(Boolean);
    }
    
    // --- 4. RENDER FUNCTIONS ---
    const createStepperInput = (type, value, increment, dropIndex) => `
        <div class="stepper-input">
            <button class="stepper-btn minus" data-type="${type}" data-increment="-${increment}" data-drop-index="${dropIndex}">-</button>
            <input type="number" class="inline-log-input" data-field="${type}" value="${value}" step="${increment === 5 ? 2.5 : 1}" data-drop-index="${dropIndex}">
            <button class="stepper-btn plus" data-type="${type}" data-increment="${increment}" data-drop-index="${dropIndex}">+</button>
        </div>`;
    const createWarmupToggle = (isChecked) => `
    <div class="warmup-toggle-container">
        <span class="warmup-label">W/u</span>
        <label class="warmup-toggle">
            <input type="checkbox" class="warmup-checkbox" ${isChecked ? 'checked' : ''}>
            <span class="warmup-slider"></span>
        </label>
    </div>`;
    function renderLogEntries() {
    const workout = (getState().workouts || []).find(w => w && w.id === currentWorkoutId);
    if (!workout || !workoutLogEntries) { if(workoutLogEntries) workoutLogEntries.innerHTML = ''; return; }
    workout.exercises = migrateExerciseData(workout.exercises);
    workoutLogEntries.innerHTML = '';
    const isWorkoutFinished = workout.isFinished || false;
    workout.exercises.forEach(exercise => {
        const exerciseCard = document.createElement('div');
        exerciseCard.className = `exercise-card ${exercise.type === 'superset' ? 'superset-card' : ''}`;
        exerciseCard.dataset.exerciseId = exercise.id;
        let headerHTML = `<div class="exercise-header">`;
        if (exercise.type === 'superset') {
            headerHTML += `<h4>Superset</h4>`;
        } else {
            const subEx = exercise.subExercises[0];
            if (exercise.isEditing) {
                headerHTML += `<input type="text" class="inline-log-input exercise-name-input" data-sub-exercise-id="${subEx.id}" placeholder="Enter Exercise Name..." value="${subEx.name || ''}" autocomplete="off">`;
            } else {
                headerHTML += `<h4>${subEx.name || 'Unnamed Exercise'}</h4>`;
            }
        }
        if (!isWorkoutFinished) {
            headerHTML += `<div class="actions"><button class="icon-btn edit-exercise" title="Edit Exercise">&#9998;</button><button class="icon-btn delete-exercise" title="Delete Exercise">&#128465;</button></div>`;
        }
        headerHTML += `</div>`;
        let bodyHTML = '<div class="sub-exercise-list">';
        exercise.subExercises.forEach((subEx, subExIndex) => {
            let subExHTML = `<div class="sub-exercise" data-sub-exercise-id="${subEx.id}">`;
            if (exercise.type === 'superset') {
                if (exercise.isEditing) {
                    subExHTML += `<div class="superset-exercise-header">
                                    <span class="superset-number">${subExIndex + 1}.</span>
                                    <input type="text" class="inline-log-input exercise-name-input" data-sub-exercise-id="${subEx.id}" placeholder="Exercise ${subExIndex + 1} Name..." value="${subEx.name || ''}" autocomplete="off">
                                    <button class="icon-btn delete delete-sub-exercise-btn" title="Remove Exercise from Superset">&#10006;</button>
                                  </div>`;
                } else {
                    subExHTML += `<div class="superset-exercise-header"><span class="superset-number">${subExIndex + 1}.</span> <strong>${subEx.name || 'Unnamed'}</strong></div>`;
                }
            }
            if (isWorkoutFinished || !exercise.isEditing) {
                const summaryString = createSetsSummaryString(subEx.sets);
                subExHTML += `<div class="sets-summary-display">${summaryString}</div>`;
            } else {
                if (subEx.sets.length > 0) {
                    subExHTML += `<div class="set-row-header-flex"><span></span><span>WEIGHT</span><span>REPS</span><span>ACTIONS</span></div>`;
                }
                subEx.sets.forEach((set, setIndex) => {
                    subExHTML += `<div class="set-container ${set.isWarmup ? 'warmup-set' : ''}" data-set-id="${set.id}">`;
                    set.drops.forEach((drop, dropIndex) => {
                        
                        // --- WARMUP TOGGLE LOGIC IS MOVED FROM HERE... ---
                        let actionButtonsHTML = '';
                        if (dropIndex === set.drops.length - 1) {
                            actionButtonsHTML = `<button class="icon-btn complete-set-btn" title="Complete Set">&#10004;</button>`;
                        } else {
                            actionButtonsHTML = `<span class="action-placeholder"></span>`;
                        }
                        // The toggle is no longer part of the actions group
                        const actionsHTML = `
                            <div class="set-actions-group">
                                ${actionButtonsHTML}
                                <button class="icon-btn delete-drop" title="Delete Drop">&#10006;</button>
                            </div>
                        `;

                        // --- ...AND IS ADDED HERE, INSIDE THE SET NUMBER CONTAINER ---
                        let setNumberContent = `<span class="set-number">${setIndex + 1}${set.drops.length > 1 ? `.${dropIndex + 1}` : ''}</span>`;
                        if (setIndex === 0 && dropIndex === 0) {
                            setNumberContent += createWarmupToggle(set.isWarmup);
                        }

                        subExHTML += `<div class="set-row" data-drop-index="${dropIndex}">
                            <div class="set-number-container">
                                ${setNumberContent}
                            </div>
                            ${createStepperInput('weight', drop.weight, 5, dropIndex)}
                            ${createStepperInput('reps', drop.reps, 1, dropIndex)}
                            ${actionsHTML}
                        </div>`;
                    });
                    if (activeRestTimer.setId === set.id) {
                        subExHTML += `<div class="rest-timer-inline"><span class="rest-timer-inline-time">00:00</span><button class="btn-secondary dismiss-rest-timer">Dismiss</button></div>`;
                    }
                    subExHTML += `</div>`; 
                });
                
                let addButtonsHTML = `<button class="add-set-btn" title="Add Set">+</button>
                                      <button class="add-drop-to-last-set-btn" title="Add Drop to Last Set">&#8629;</button>`;
                
                if (exercise.type === 'superset') {
                    addButtonsHTML += `<button class="add-exercise-to-superset-btn" title="Add Exercise to Superset">
                                         <img src="icons/exercise.png" alt="Add Exercise to Superset">
                                       </button>`;
                }
                
                subExHTML += `<div class="add-set-btn-container">${addButtonsHTML}</div>`;
            }
            subExHTML += '</div>'; 
            bodyHTML += subExHTML;
        });
        bodyHTML += '</div>';

        let footerHTML = '';
        if (exercise.isEditing) {
            footerHTML += `<div class="exercise-done-btn-container"><button class="btn-primary exercise-done-btn">Done</button></div>`;
        }

        exerciseCard.innerHTML = headerHTML + bodyHTML + footerHTML;
        workoutLogEntries.appendChild(exerciseCard);
    });
    if (!isWorkoutFinished && currentWorkoutId) {
        const addExerciseRow = document.createElement('div');
        addExerciseRow.className = 'add-exercise-row';
        addExerciseRow.innerHTML = `
            <button class="log-action-btn add-exercise-btn" title="Add New Exercise">
                <img src="icons/exercise.png" alt="Add Exercise">
            </button>
            <button class="log-action-btn add-superset-btn" title="Add Superset">
                <img src="icons/superset_icon2.png" alt="Add Superset">
            </button>
        `;
        workoutLogEntries.appendChild(addExerciseRow);
    }
}

    function renderCurrentWorkoutView() {
        const workout = (getState().workouts || []).find(w => w && w.id === currentWorkoutId);
        if (!workout) return;
        const sortedWorkouts = (getState().workouts || []).sort((a, b) => {
            if (!a || !b) return 0;
            if (a.date > b.date) return -1; if (a.date < b.date) return 1; return (b.startTime || 0) - (a.startTime || 0);
        });
        const currentIndex = sortedWorkouts.findIndex(w => w && w.id === currentWorkoutId);
        prevWorkoutBtn.disabled = currentIndex >= sortedWorkouts.length - 1;
        nextWorkoutBtn.disabled = currentIndex <= 0;
        const isFinished = workout.isFinished || false;
        workoutTitle.textContent = `${formatDate(workout.date)} - ${workout.category}`;
        bodyweightValue.textContent = workout.bodyweight;
        bodyweightDisplayContainer.style.display = workout.bodyweight ? 'block' : 'none';
        finishWorkoutBtn.style.display = isFinished ? 'none' : 'block';
        const workoutHeaderActions = document.querySelector('#current-workout-section .workout-header-actions');
        if (!workoutHeaderActions) return;
        workoutHeaderActions.innerHTML = '';
        if (isFinished) {
            const editBtn = document.createElement('button');
            editBtn.className = 'icon-btn edit'; editBtn.title = 'Edit Workout'; editBtn.innerHTML = '&#9998;';
            editBtn.addEventListener('click', () => {
                const w = (getState().workouts || []).find(w => w && w.id === currentWorkoutId);
                if (w) { w.isFinished = false; w.exercises.forEach(ex => ex.isEditing = true); saveDataToFirebase(); render(); }
            });
            workoutHeaderActions.appendChild(editBtn);
            const shareBtn = document.createElement('button');
            shareBtn.className = 'icon-btn share'; shareBtn.title = 'Share this workout'; shareBtn.innerHTML = '&#128279;';
            shareBtn.addEventListener('click', () => { if (sharingModule) { sharingModule.openShareModal(workout.id, workout.date); }});
            workoutHeaderActions.appendChild(shareBtn);
        }
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete'; deleteBtn.title = 'Delete this workout'; deleteBtn.innerHTML = '&#128465;';
        deleteBtn.addEventListener('click', async () => {
            if (await showConfirmation("Delete this entire workout log?")) {
                getState().workouts = (getState().workouts || []).filter(w => w && w.id !== currentWorkoutId);
                currentWorkoutId = null;
                saveDataToFirebase();
                render();
            }
        });
        workoutHeaderActions.appendChild(deleteBtn);
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        if (workout.duration) {
            workoutTimerDisplay.querySelector('span').textContent = formatDuration(workout.duration);
            workoutTimerDisplay.style.display = 'inline-flex';
        } else if (!isFinished && workout.startTime) {
            startTimerDisplay(workout.startTime);
        } else {
            workoutTimerDisplay.style.display = 'none';
        }
        renderLogEntries();
    }
    function renderSummary(category) {
    const todayString = getTodayDateString(); // Get today's date string
    const allWorkouts = getState().workouts || [];

    const lastWorkout = allWorkouts
        .filter(w => w && w.category === category && w.date < todayString) // <-- ADDED THE DATE CHECK
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (!lastWorkout) {
        if(workoutSummaryContent) workoutSummaryContent.innerHTML = '<p>No previous workout found for this category (before today).</p>';
        return;
    }
        let summaryHTML = `<p><strong>${formatDate(lastWorkout.date)}</strong></p>`;
        const exercisesToRender = migrateExerciseData(lastWorkout.exercises);
        if (exercisesToRender.length > 0) {
            summaryHTML += '<table class="log-table"><thead><tr><th>Exercise</th><th>Sets</th></tr></thead><tbody>';
            exercisesToRender.forEach(ex => {
                const exerciseName = ex.type === 'superset'
                    ? ex.subExercises.map(sub => sub.name || 'Unnamed').join(' / ')
                    : (ex.subExercises[0] ? ex.subExercises[0].name : 'Unnamed Exercise');
                const allSets = ex.subExercises.flatMap(sub => sub.sets || []);
                const setsSummary = createSetsSummaryString(allSets);
                summaryHTML += `<tr><td>${exerciseName}</td><td>${setsSummary}</td></tr>`;
            });
            summaryHTML += '</tbody></table>';
        } else {
            summaryHTML += '<p>No exercises were logged.</p>';
        }
        workoutSummaryContent.innerHTML = summaryHTML;
    }
    function renderWorkoutCalendar() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const workoutsByDate = (getState().workouts || []).reduce((acc, w) => {
            if (w && w.date) { (acc[w.date] = acc[w.date] || []).push(w); }
            return acc;
        }, {});
        calendarViewDate.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(calendarViewDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        calendarMonthYear.textContent = calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        calendarDaysGrid.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            const dateString = toLocalISOString(day);
            const workoutsOnDay = workoutsByDate[dateString];
            const isToday = day.getTime() === today.getTime();
            const isSelected = dateString === selectedDate;
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.date = dateString;
            if (isToday) dayEl.classList.add('is-today');
            if (isSelected) dayEl.classList.add('is-selected');
            dayEl.innerHTML = `<span class="day-number">${day.getDate()}</span>`;
            if (workoutsOnDay) {
                const barContainer = document.createElement('div');
                barContainer.className = 'calendar-bar-container';
                workoutsOnDay.slice(0, 3).forEach(workout => {
                    if (!workout) return;
                    const bar = document.createElement('button');
                    bar.className = 'calendar-workout-bar';
                    bar.dataset.workoutId = workout.id;
                    bar.classList.add(`category-${workout.category.toLowerCase().replace(/ /g, '-')}`);
                    bar.textContent = workout.category;
                    barContainer.appendChild(bar);
                });
                dayEl.appendChild(barContainer);
            }
            calendarDaysGrid.appendChild(dayEl);
        }
    }
    function render() {
        if (!getState) return; // Guard against render being called before init
        if (!selectedDate) selectedDate = getTodayDateString();
        renderWorkoutCalendar();
        const currentWorkout = (getState().workouts || []).find(w => w && w.id === currentWorkoutId);
        if (currentWorkout && currentWorkout.date !== selectedDate) { currentWorkoutId = null; }
        if (!currentWorkoutId) {
            const firstWorkoutOnDay = (getState().workouts || []).find(w => w && w.date === selectedDate);
            if (firstWorkoutOnDay) { currentWorkoutId = firstWorkoutOnDay.id; }
        }
        if (currentWorkoutId) {
            renderCurrentWorkoutView();
            currentWorkoutSection.style.display = 'block';
        } else {
            if (workoutTimerInterval) clearInterval(workoutTimerInterval);
            if (currentWorkoutSection) currentWorkoutSection.style.display = 'none';
        }
        const createWorkoutSection = document.getElementById('create-workout-section');
        if (createWorkoutSection) createWorkoutSection.style.display = 'block';
    }

    // --- 5. EVENT BINDING ---
    function bindEvents() {
        calendarDaysGrid.addEventListener('click', (e) => {
            const bar = e.target.closest('.calendar-workout-bar');
            const dayEl = e.target.closest('.calendar-day');
            if (bar) {
                e.stopPropagation();
                currentWorkoutId = Number(bar.dataset.workoutId);
                selectedDate = dayEl.dataset.date;
                render();
            } else if (dayEl) {
                selectedDate = dayEl.dataset.date;
                const firstWorkoutOnDay = (getState().workouts || []).find(w => w && w.date === selectedDate);
                currentWorkoutId = firstWorkoutOnDay ? firstWorkoutOnDay.id : null;
                render();
            }
        });
        startWorkoutBtn.addEventListener('click', () => {
            const date = selectedDate;
            const workoutsOnDay = (getState().workouts || []).filter(w => w && w.date === date);
            if (workoutsOnDay.length >= 3) {
                alert('Maximum of 3 workouts per day reached.');
                return;
            }
            const newWorkout = {
                id: Date.now(), date, bodyweight: workoutBodyweightInput.value, category: workoutCategorySelect.value,
                exercises: [], isFinished: false, startTime: Date.now()
            };
            if(!Array.isArray(getState().workouts)) { getState().workouts = []; }
            getState().workouts.push(newWorkout);
            currentWorkoutId = newWorkout.id;
            saveDataToFirebase();
            render();
        });
        workoutLogEntries.addEventListener('click', async (e) => {
    const target = e.target.closest('button') || e.target;
    const workout = (getState().workouts || []).find(w => w && w.id === currentWorkoutId);
    if (!workout || workout.isFinished) return;
    
    if (target.matches('.add-exercise-btn') || target.matches('.add-superset-btn')) {
        if (restTimerInterval) { clearInterval(restTimerInterval); activeRestTimer = { setId: null, startTime: 0 }; }
        const isSuperset = target.matches('.add-superset-btn');
        const newExercise = {
            id: Date.now(), type: isSuperset ? 'superset' : 'single', isEditing: true,
            subExercises: [{ id: Date.now() + 1, name: '', sets: [] }]
        };
        if (isSuperset) { newExercise.subExercises.push({ id: Date.now() + 2, name: '', sets: [] }); }
        if (!Array.isArray(workout.exercises)) workout.exercises = [];
        workout.exercises.push(newExercise);
        renderLogEntries();
        const newCard = workoutLogEntries.querySelector(`[data-exercise-id="${newExercise.id}"]`);
        if (newCard) newCard.querySelector('input').focus();
        return;
    }

    const exerciseCard = target.closest('.exercise-card');
    if (!exerciseCard) return;
    const exerciseId = Number(exerciseCard.dataset.exerciseId);
    const exercise = workout.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const subExerciseEl = target.closest('.sub-exercise');
    const subExerciseId = subExerciseEl ? Number(subExerciseEl.dataset.subExerciseId) : null;
    const subExercise = subExerciseId ? exercise.subExercises.find(sub => sub.id === subExerciseId) : null;

    const setContainer = target.closest('.set-container');
    const setId = setContainer ? Number(setContainer.dataset.setId) : null;
    const set = (subExercise && setId) ? subExercise.sets.find(s => s.id === setId) : null;

    if (target.matches('.add-set-btn') && subExercise) {
        if (restTimerInterval) { clearInterval(restTimerInterval); activeRestTimer = { setId: null, startTime: 0 }; }
        const lastSet = subExercise.sets[subExercise.sets.length - 1];
        const lastDrop = lastSet ? lastSet.drops[lastSet.drops.length - 1] : null;
        subExercise.sets.push({
            id: Date.now(), isWarmup: false,
            drops: [{ weight: lastDrop ? lastDrop.weight : '', reps: lastDrop ? lastDrop.reps : '' }]
        });
        renderLogEntries();
    } else if (target.matches('.add-drop-to-last-set-btn') && subExercise) {
        if (subExercise.sets.length > 0) {
            const lastSet = subExercise.sets[subExercise.sets.length - 1];
            const lastDrop = lastSet.drops[lastSet.drops.length - 1];
            lastSet.drops.push({ weight: lastDrop ? lastDrop.weight : '', reps: '' });
            saveDataToFirebase();
            renderLogEntries();
        } else {
            alert("You must add at least one set before adding a drop set.");
        }
    } else if (target.matches('.add-exercise-to-superset-btn')) {
        exercise.subExercises.push({ id: Date.now(), name: '', sets: [] });
        renderLogEntries();
    } else if (target.matches('.delete-sub-exercise-btn') && subExercise) {
        exercise.subExercises = exercise.subExercises.filter(sub => sub.id !== subExercise.id);
        if (exercise.subExercises.length === 1) {
            exercise.type = 'single';
        }
        if (exercise.subExercises.length === 0) {
             workout.exercises = workout.exercises.filter(ex => ex.id !== exercise.id);
        }
        saveDataToFirebase();
        renderLogEntries();
    } else if (target.matches('.exercise-done-btn')) {
        const hasValidName = exercise.subExercises.some(sub => sub.name && sub.name.trim() !== '');
        if (hasValidName) {
            exercise.isEditing = false;
            exercise.subExercises = exercise.subExercises.filter(sub => sub.name && sub.name.trim() !== '');
        } else {
            workout.exercises = workout.exercises.filter(ex => ex.id !== exerciseId);
        }
        saveDataToFirebase();
        renderLogEntries();
    } else if (target.matches('.edit-exercise')) {
        exercise.isEditing = true;
        renderLogEntries();
    } else if (target.matches('.delete-exercise')) {
        if (await showConfirmation("Delete this entire card?")) {
            workout.exercises = workout.exercises.filter(ex => ex.id !== exerciseId);
            saveDataToFirebase();
            renderLogEntries();
        }
    
    // --- BUG FIX #1: The 'delete set' logic is updated here ---
    } else if (target.matches('.delete-drop')) {
        const setRow = target.closest('.set-row');
        const dropIndex = Number(setRow.dataset.dropIndex);
        if (set) {
            if (set.drops.length > 1) {
                // If there's more than one drop, just remove this one
                set.drops.splice(dropIndex, 1);
            } else {
                // If it's the last drop, remove the ENTIRE set
                subExercise.sets = subExercise.sets.filter(s => s.id !== set.id);
            }
            saveDataToFirebase();
            renderLogEntries();
        }
    
    } else if (target.matches('.stepper-btn')) {
        const setRow = target.closest('.set-row');
        const input = setRow.querySelector(`input[data-drop-index="${target.dataset.dropIndex}"][data-field="${target.dataset.type}"]`);
        if (input) {
            const increment = Number(target.dataset.increment);
            input.value = Math.max(0, (Number(input.value) || 0) + increment).toString();
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    
    // --- BUG FIX #2: The typo 'activeRestimer' is corrected to 'activeRestTimer' ---
    } else if (target.matches('.complete-set-btn') && set) {
        if (restTimerInterval) clearInterval(restTimerInterval);
        activeRestTimer = { setId: set.id, startTime: Date.now() }; // TYPO FIXED HERE
        renderLogEntries();
        const timerDisplay = workoutLogEntries.querySelector('.rest-timer-inline-time');
        if (timerDisplay) {
            timerDisplay.textContent = '00:00';
            restTimerInterval = setInterval(() => {
                if(activeRestTimer.setId === set.id && timerDisplay) {
                   timerDisplay.textContent = formatRestTime(Date.now() - activeRestTimer.startTime);
                } else {
                    clearInterval(restTimerInterval);
                }
            }, 1000);
        }
        
    } else if (target.matches('.dismiss-rest-timer')) {
        if (restTimerInterval) clearInterval(restTimerInterval);
        activeRestTimer = { setId: null, startTime: 0 };
        renderLogEntries();
    } else if (target.matches('.warmup-checkbox')) {
        if(set) {
            set.isWarmup = target.checked;
            saveDataToFirebase();
            renderLogEntries();
        }
    }
});
        workoutLogEntries.addEventListener('input', (e) => {
            const workout = (getState().workouts || []).find(w => w && w.id === currentWorkoutId);
            if (!workout) return;
            const target = e.target;
            const exerciseCard = target.closest('.exercise-card');
            if(!exerciseCard) return;
            const exerciseId = Number(exerciseCard.dataset.exerciseId);
            const exercise = workout.exercises.find(ex => ex.id === exerciseId);
            if (!exercise) return;
            if (target.matches('.exercise-name-input')) {
                const subExerciseId = Number(target.dataset.subExerciseId);
                const subExercise = exercise.subExercises.find(sub => sub.id === subExerciseId);
                if (subExercise) {
                    subExercise.name = target.value;
                    activeExerciseInput = target;
                    const query = target.value.toLowerCase();
                    const inputRect = activeExerciseInput.getBoundingClientRect();
                    exerciseSearchResults.style.top = `${inputRect.bottom + window.scrollY}px`;
                    exerciseSearchResults.style.left = `${inputRect.left + window.scrollX}px`;
                    exerciseSearchResults.style.width = `${inputRect.width}px`;
                    if (query.length < 1) { exerciseSearchResults.style.display = 'none'; return; }
                    const filtered = (getState().exercises || []).filter(ex => ex && ex.name && ex.name.toLowerCase().includes(query));
                    exerciseSearchResults.innerHTML = filtered.map(ex => `<div class="search-result-item">${ex.name}</div>`).join('');
                    exerciseSearchResults.style.display = filtered.length > 0 ? 'block' : 'none';
                }
            }
            const setRow = target.closest('.set-row');
            if (setRow && target.matches('.inline-log-input')) {
                const subExerciseEl = target.closest('.sub-exercise');
                const setContainer = target.closest('.set-container');
                if (subExerciseEl && setContainer) {
                    const subExerciseId = Number(subExerciseEl.dataset.subExerciseId);
                    const setId = Number(setContainer.dataset.setId);
                    const dropIndex = Number(target.dataset.dropIndex);
                    const subExercise = exercise.subExercises.find(sub => sub.id === subExerciseId);
                    const set = subExercise ? subExercise.sets.find(s => s.id === setId) : null;
                    if(set && set.drops[dropIndex]) {
                         set.drops[dropIndex][target.dataset.field] = target.value;
                    }
                }
            }
            saveDataToFirebase();
        });
        workoutLogEntries.addEventListener('blur', (e) => {
             if (e.target.matches('.exercise-name-input')) {
                 setTimeout(() => {
                     if (document.activeElement.closest('.search-result-item')) return;
                     exerciseSearchResults.style.display = 'none';
                 }, 200);
             }
        }, true);
        exerciseSearchResults.addEventListener('click', (e) => {
            if (e.target.matches('.search-result-item') && activeExerciseInput) {
                const newName = e.target.textContent;
                const exerciseCard = activeExerciseInput.closest('.exercise-card');
                const subExerciseId = Number(activeExerciseInput.dataset.subExerciseId);
                const exerciseId = Number(exerciseCard.dataset.exerciseId);
                const workout = (getState().workouts || []).find(w => w && w.id === currentWorkoutId);
                if (!workout) return;
                const exercise = workout.exercises.find(ex => ex.id === exerciseId);
                if (!exercise) return;
                const subExercise = exercise.subExercises.find(sub => sub.id === subExerciseId);
                if (subExercise) {
                    subExercise.name = newName;
                    saveDataToFirebase();
                    renderLogEntries();
                }
                exerciseSearchResults.style.display = 'none';
                activeExerciseInput = null;
            }
        });
        calendarPrevWeekBtn.addEventListener('click', () => { calendarViewDate.setDate(calendarViewDate.getDate() - 7); render(); });
        calendarNextWeekBtn.addEventListener('click', () => { calendarViewDate.setDate(calendarViewDate.getDate() + 7); render(); });
        prevWorkoutBtn.addEventListener('click', () => { const s = (getState().workouts || []).sort((a,b)=>new Date(b.date)-new Date(a.date)||(b.startTime||0)-(a.startTime||0)); const i = s.findIndex(w=>w && w.id===currentWorkoutId); if(i !== -1 && i<s.length-1){ selectedDate = s[i+1].date; currentWorkoutId = s[i+1].id; render(); } });
        nextWorkoutBtn.addEventListener('click', () => { const s = (getState().workouts || []).sort((a,b)=>new Date(b.date)-new Date(a.date)||(b.startTime||0)-(a.startTime||0)); const i = s.findIndex(w=>w && w.id===currentWorkoutId); if(i > 0){ selectedDate = s[i-1].date; currentWorkoutId = s[i-1].id; render(); } });
        finishWorkoutBtn.addEventListener('click', () => { const w = (getState().workouts || []).find(w => w && w.id === currentWorkoutId); if (w) { w.exercises.forEach(ex => ex.isEditing = false); if (workoutTimerInterval) clearInterval(workoutTimerInterval); if (w.startTime && !w.duration) w.duration = Date.now() - w.startTime; w.isFinished = true; saveDataToFirebase(); render(); } });
        editBodyweightBtn.addEventListener('click', () => { const w = (getState().workouts || []).find(w => w && w.id === currentWorkoutId); if (!w) return; const nBw = prompt("Enter new body weight (lbs):", w.bodyweight || ''); if (nBw !== null) { w.bodyweight = parseFloat(nBw) || ''; saveDataToFirebase(); render(); } });
        summaryCategorySelect.addEventListener('change', (e) => renderSummary(e.target.value));
        workoutCategorySelect.addEventListener('change', (e) => { summaryCategorySelect.value = e.target.value; renderSummary(e.target.value); });
    }
    
    // --- 6. INITIALIZATION ---
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        getTodayDateString = api.getTodayDateString;
        formatDate = api.formatDate;
        showConfirmation = api.showConfirmation;
        sharingModule = api.sharingModule;

        // Assign all DOM elements here, inside init()
        workoutBodyweightInput = document.getElementById('workout-bodyweight');
        workoutCategorySelect = document.getElementById('workout-category');
        startWorkoutBtn = document.getElementById('start-workout-btn');
        currentWorkoutSection = document.getElementById('current-workout-section');
        workoutTitle = document.getElementById('workout-title');
        prevWorkoutBtn = document.getElementById('prev-workout-btn');
        nextWorkoutBtn = document.getElementById('next-workout-btn');
        workoutLogEntries = document.getElementById('workout-log-entries');
        exerciseSearchResults = document.getElementById('workout-exercise-search-results');
        finishWorkoutBtn = document.getElementById('finish-workout-btn');
        summaryCategorySelect = document.getElementById('summary-category-select');
        workoutSummaryContent = document.getElementById('workout-summary-content');
        calendarMonthYear = document.getElementById('calendar-month-year');
        calendarDaysGrid = document.getElementById('calendar-days-grid');
        calendarPrevWeekBtn = document.getElementById('calendar-prev-week');
        calendarNextWeekBtn = document.getElementById('calendar-next-week');
        workoutTimerDisplay = document.getElementById('workout-timer-display');
        bodyweightValue = document.getElementById('bodyweight-value');
        bodyweightDisplayContainer = document.getElementById('bodyweight-display-container');
        editBodyweightBtn = document.getElementById('edit-bodyweight-btn');

        // Critical check to ensure all elements were found.
        const allElements = [workoutBodyweightInput, workoutCategorySelect, startWorkoutBtn, currentWorkoutSection,
        workoutTitle, prevWorkoutBtn, nextWorkoutBtn, workoutLogEntries, exerciseSearchResults,
        finishWorkoutBtn, summaryCategorySelect, workoutSummaryContent, calendarMonthYear,
        calendarDaysGrid, calendarPrevWeekBtn, calendarNextWeekBtn, workoutTimerDisplay, bodyweightValue, bodyweightDisplayContainer, editBodyweightBtn];
        
        if (allElements.some(el => el === null)) {
            console.error("FATAL: One or more DOM elements required by the workout module were not found. Check your HTML for missing or misspelled IDs.");
            return; // Stop initialization if the DOM is not ready.
        }

        selectedDate = getTodayDateString();
        workoutCategorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        summaryCategorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        
        try {
            renderSummary(summaryCategorySelect.value);
            bindEvents();
        } catch (error) {
            console.error("An error occurred during workout module initialization:", error);
        }
    }
    
    return { init, render };
}