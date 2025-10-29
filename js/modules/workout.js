// js/modules/workout.js (V12 - Direct Calendar Selection - UNTRUNCATED)
function createWorkoutModule() {
    // --- 1. MODULE SCOPE & REFERENCES ---
    let db, getState, saveDataToFirebase, getTodayDateString, formatDate, showConfirmation;
    let currentWorkoutId = null,
        selectedDate = null,
        calendarViewDate = new Date();
    let workoutTimerInterval = null,
        restTimerInterval = null,
        activeRestTimer = { setId: null, startTime: 0 },
        activeExerciseInput = null;

    // DOM Elements
    const workoutBodyweightInput = document.getElementById('workout-bodyweight');
    const workoutCategorySelect = document.getElementById('workout-category');
    const startWorkoutBtn = document.getElementById('start-workout-btn');
    const currentWorkoutSection = document.getElementById('current-workout-section');
    const workoutTitle = document.getElementById('workout-title');
    const prevWorkoutBtn = document.getElementById('prev-workout-btn');
    const nextWorkoutBtn = document.getElementById('next-workout-btn');
    const editWorkoutBtn = document.getElementById('edit-workout-btn');
    const deleteWorkoutBtn = document.getElementById('delete-workout-btn');
    const workoutLogEntries = document.getElementById('workout-log-entries');
    const exerciseSearchResults = document.getElementById('workout-exercise-search-results');
    const finishWorkoutBtn = document.getElementById('finish-workout-btn');
    const summaryCategorySelect = document.getElementById('summary-category-select');
    const workoutSummaryContent = document.getElementById('workout-summary-content');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarDaysGrid = document.getElementById('calendar-days-grid');
    const calendarPrevWeekBtn = document.getElementById('calendar-prev-week');
    const calendarNextWeekBtn = document.getElementById('calendar-next-week');
    const workoutTimerDisplay = document.getElementById('workout-timer-display');
    const CATEGORIES = ['Push', 'Pull', 'Legs', 'Upper Body', 'Lower Body', 'Full Body', 'Other'];

    // --- 2. HELPER & UTILITY ---
    const toLocalISOString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const formatDuration = (ms) => {
        if (!ms || ms < 0) return '00:00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600), m = Math.floor((totalSeconds % 3600) / 60), s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const startTimerDisplay = (startTime) => {
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        workoutTimerDisplay.style.display = 'inline-flex';
        workoutTimerInterval = setInterval(() => {
            workoutTimerDisplay.querySelector('span').textContent = formatDuration(Date.now() - startTime);
        }, 1000);
    };
    const formatRestTime = (ms) => {
        if (!ms || ms < 0) return '00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60), s = totalSeconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    function createSetsSummaryString(sets) {
        if (!sets || sets.length === 0) return 'No sets logged';
        const setGroups = new Map();
        sets.forEach(set => {
            const weight = set.weight || 0;
            const reps = set.reps || 0;
            const key = `${weight}-${reps}`;
            if (!setGroups.has(key)) setGroups.set(key, { count: 0, weight, reps });
            setGroups.get(key).count++;
        });
        const summaryParts = [];
        for (const group of setGroups.values()) {
            summaryParts.push(`${group.count} ${group.count > 1 ? 'sets' : 'set'} of ${group.reps} x ${group.weight}lbs`);
        }
        return summaryParts.join('<br>');
    }

    // --- 3. DATA MIGRATION ---
    function migrateExerciseData(exercises) {
        if (!exercises || exercises.length === 0) return [];
        // Check if the data is already in the new format
        if (exercises[0] && Array.isArray(exercises[0].sets)) return exercises;
        const exerciseMap = new Map();
        exercises.forEach(oldEntry => {
            if (!oldEntry.name) return;
            if (!exerciseMap.has(oldEntry.name)) {
                exerciseMap.set(oldEntry.name, { id: oldEntry.id || Date.now() + Math.random(), name: oldEntry.name, isEditing: false, sets: [] });
            }
            const exercise = exerciseMap.get(oldEntry.name);
            const numSets = parseInt(oldEntry.sets, 10) || 1;
            for (let i = 0; i < numSets; i++) {
                exercise.sets.push({ id: Date.now() + Math.random(), weight: oldEntry.weight || '', reps: oldEntry.reps || '' });
            }
        });
        return Array.from(exerciseMap.values());
    }

    // --- 4. RENDER FUNCTIONS ---
    const createStepperInput = (type, value, increment) => `
        <div class="stepper-input">
            <button class="stepper-btn minus" data-type="${type}" data-increment="-${increment}">-</button>
            <input type="number" class="inline-log-input" data-field="${type}" value="${value}" step="${increment === 5 ? 2.5 : 1}">
            <button class="stepper-btn plus" data-type="${type}" data-increment="${increment}">+</button>
        </div>`;

    function renderLogEntries() {
        const workout = getState().workouts.find(w => w.id === currentWorkoutId);
        if (!workout) {
            workoutLogEntries.innerHTML = '';
            return;
        }
        workout.exercises = migrateExerciseData(workout.exercises);
        workoutLogEntries.innerHTML = '';
        const isWorkoutFinished = workout.isFinished || false;
        workout.exercises.forEach(exercise => {
            const exerciseCard = document.createElement('div');
            exerciseCard.className = 'exercise-card';
            exerciseCard.dataset.exerciseId = exercise.id;
            const isNameSetAndNotEditing = exercise.name && !exercise.isEditing;
            let headerHTML = `<div class="exercise-header">${isNameSetAndNotEditing
                ? `<h4>${exercise.name}</h4><div class="actions">${!isWorkoutFinished ? `<button class="icon-btn edit-exercise" title="Edit Exercise">&#9998;</button><button class="icon-btn delete-exercise" title="Delete Exercise">&#128465;</button>` : ''}</div>`
                : `<input type="text" class="inline-log-input exercise-name-input" placeholder="Enter Exercise Name..." value="${exercise.name || ''}" autocomplete="off">`}</div>`;
            let bodyHTML = '<div class="set-list">';
            if (exercise.name) {
                if (exercise.sets.length > 0) bodyHTML += `<div class="set-row-header"><span>WEIGHT (LBS)</span><span>REPS</span></div>`;
                exercise.sets.forEach((set, index) => {
                    let setRowHTML = '';
                    if (isNameSetAndNotEditing || isWorkoutFinished) {
                        setRowHTML = `<div class="set-row"><span class="set-number">${index + 1}</span><span>${set.weight || 0}</span><span>${set.reps || 0}</span></div>`;
                    } else {
                        setRowHTML = `<div class="set-row" data-set-id="${set.id}"><span class="set-number">${index + 1}</span>${createStepperInput('weight', set.weight, 5)}${createStepperInput('reps', set.reps, 1)}<button class="icon-btn complete-set-btn" title="Complete Set">&#10004;</button><button class="icon-btn delete-set" title="Delete Set">&#10006;</button></div>`;
                    }
                    if (activeRestTimer.setId === set.id) {
                        setRowHTML += `<div class="rest-timer-inline"><span class="rest-timer-inline-time">00:00</span><div class="rest-timer-inline-actions"><button class="btn-secondary dismiss-rest-timer">Dismiss</button></div></div>`;
                    }
                    bodyHTML += setRowHTML;
                });
                if (!isNameSetAndNotEditing && !isWorkoutFinished) {
                    bodyHTML += `<div class="add-set-btn-container"><button class="add-set-btn" title="Add Set">+</button></div>`;
                }
            }
            bodyHTML += '</div>';
            let footerHTML = (exercise.name && exercise.isEditing) ? `<div class="exercise-done-btn-container"><button class="btn-primary exercise-done-btn">Done</button></div>` : '';
            exerciseCard.innerHTML = headerHTML + bodyHTML + footerHTML;
            workoutLogEntries.appendChild(exerciseCard);
        });
        if (!isWorkoutFinished && currentWorkoutId) {
            const addExerciseRow = document.createElement('div');
            addExerciseRow.className = 'add-exercise-row';
            addExerciseRow.innerHTML = `<button class="add-exercise-btn" title="Add New Exercise">+</button>`;
            workoutLogEntries.appendChild(addExerciseRow);
        }
    }
    
    function renderCurrentWorkoutView() {
        const workout = getState().workouts.find(w => w.id === currentWorkoutId);
        if (!workout) return;
        const sortedWorkouts = getState().workouts.sort((a, b) => {
            if (a.date > b.date) return -1;
            if (a.date < b.date) return 1;
            return (b.startTime || 0) - (a.startTime || 0);
        });
        const currentIndex = sortedWorkouts.findIndex(w => w.id === currentWorkoutId);
        prevWorkoutBtn.disabled = currentIndex >= sortedWorkouts.length - 1;
        nextWorkoutBtn.disabled = currentIndex <= 0;
        const isFinished = workout.isFinished || false;
        workoutTitle.textContent = `${formatDate(workout.date)} - ${workout.category}`;
        document.getElementById('bodyweight-value').textContent = workout.bodyweight;
        document.getElementById('bodyweight-display-container').style.display = workout.bodyweight ? 'block' : 'none';
        finishWorkoutBtn.style.display = isFinished ? 'none' : 'block';
        editWorkoutBtn.style.display = isFinished ? 'inline-block' : 'none';
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
        const lastWorkout = getState().workouts.filter(w => w.category === category).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (!lastWorkout) {
            workoutSummaryContent.innerHTML = '<p>No previous workout found.</p>';
            return;
        }
        let summaryHTML = `<p><strong>${formatDate(lastWorkout.date)}</strong></p>`;
        const exercisesToRender = migrateExerciseData(lastWorkout.exercises);
        if (exercisesToRender.length > 0) {
            summaryHTML += '<table class="log-table"><thead><tr><th>Exercise</th><th>Sets</th></tr></thead><tbody>';
            exercisesToRender.forEach(ex => {
                const setsSummary = createSetsSummaryString(ex.sets);
                summaryHTML += `<tr><td>${ex.name}</td><td>${setsSummary}</td></tr>`;
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
        const workoutsByDate = getState().workouts.reduce((acc, w) => {
            (acc[w.date] = acc[w.date] || []).push(w);
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
        if (!selectedDate) selectedDate = getTodayDateString();
        renderWorkoutCalendar();
        
        // If the current workout ID is no longer valid for the selected date, clear it.
        const currentWorkout = getState().workouts.find(w => w.id === currentWorkoutId);
        if (currentWorkout && currentWorkout.date !== selectedDate) {
            currentWorkoutId = null;
        }

        // If no workout is selected for the current day, try to select the first one.
        if (!currentWorkoutId) {
            const firstWorkoutOnDay = getState().workouts.find(w => w.date === selectedDate);
            if (firstWorkoutOnDay) {
                currentWorkoutId = firstWorkoutOnDay.id;
            }
        }
        
        if (currentWorkoutId) {
            renderCurrentWorkoutView();
            currentWorkoutSection.style.display = 'block';
        } else {
            if (workoutTimerInterval) clearInterval(workoutTimerInterval);
            currentWorkoutSection.style.display = 'none';
        }
        document.getElementById('create-workout-section').style.display = 'block';
    }
    // --- 5. EVENT BINDING ---
    function bindEvents() {
        // Main listener for calendar day clicks
        calendarDaysGrid.addEventListener('click', (e) => {
            const bar = e.target.closest('.calendar-workout-bar');
            const dayEl = e.target.closest('.calendar-day');

            if (bar) { // If a specific workout bar was clicked
                e.stopPropagation(); // Prevent the day-click logic from firing
                currentWorkoutId = Number(bar.dataset.workoutId);
                selectedDate = dayEl.dataset.date;
                render();
            } else if (dayEl) { // If an empty part of the day was clicked
                selectedDate = dayEl.dataset.date;
                // Find first workout of the day, or null if none
                const firstWorkoutOnDay = getState().workouts.find(w => w.date === selectedDate);
                currentWorkoutId = firstWorkoutOnDay ? firstWorkoutOnDay.id : null;
                render();
            }
        });

        // Main button to create the first workout of the day
        startWorkoutBtn.addEventListener('click', () => {
            const date = selectedDate;
            const workoutsOnDay = getState().workouts.filter(w => w.date === date);
            if (workoutsOnDay.length >= 3) {
                alert('Maximum of 3 workouts per day reached.');
                return;
            }
            const newWorkout = {
                id: Date.now(),
                date,
                bodyweight: workoutBodyweightInput.value,
                category: workoutCategorySelect.value,
                exercises: [],
                isFinished: false,
                startTime: Date.now()
            };
            getState().workouts.push(newWorkout);
            currentWorkoutId = newWorkout.id; // Set the brand new workout as the current one
            saveDataToFirebase();
            render();
        });

        // Event delegation for all actions within the workout log
        workoutLogEntries.addEventListener('click', async (e) => {
            const workout = getState().workouts.find(w => w.id === currentWorkoutId);
            if (!workout || workout.isFinished) return;

            if (e.target.matches('.add-exercise-btn')) {
                if (restTimerInterval) clearInterval(restTimerInterval);
                activeRestTimer = { setId: null, startTime: 0 };
                workout.exercises.push({ id: Date.now(), name: '', sets: [], isEditing: true });
                renderLogEntries();
                const newCard = workoutLogEntries.querySelector(`[data-exercise-id="${workout.exercises[workout.exercises.length-1].id}"]`);
                if(newCard) newCard.querySelector('input').focus();
            }

            const exerciseCard = e.target.closest('.exercise-card');
            if (!exerciseCard) return;
            const exerciseId = Number(exerciseCard.dataset.exerciseId);
            const exercise = workout.exercises.find(ex => ex.id === exerciseId);
            if (!exercise) return;

            if (e.target.matches('.add-set-btn')) {
                if (restTimerInterval) clearInterval(restTimerInterval);
                activeRestTimer = { setId: null, startTime: 0 };
                const lastSet = exercise.sets[exercise.sets.length - 1];
                exercise.sets.push({ id: Date.now(), weight: lastSet ? lastSet.weight : '', reps: lastSet ? lastSet.reps : '' });
                renderLogEntries();
            } else if (e.target.matches('.exercise-done-btn')) {
                if (!exercise.name.trim()) {
                    workout.exercises = workout.exercises.filter(ex => ex.id !== exerciseId);
                } else {
                    exercise.isEditing = false;
                }
                saveDataToFirebase();
                renderLogEntries();
            } else if (e.target.matches('.edit-exercise')) {
                exercise.isEditing = true;
                renderLogEntries();
            } else if (e.target.matches('.delete-exercise')) {
                 if (await showConfirmation(`Delete all sets for ${exercise.name}?`)) {
                    workout.exercises = workout.exercises.filter(ex => ex.id !== exerciseId);
                    saveDataToFirebase();
                    renderLogEntries();
                }
            } else if (e.target.matches('.delete-set')) {
                const setRow = e.target.closest('.set-row');
                const setId = Number(setRow.dataset.setId);
                exercise.sets = exercise.sets.filter(set => set.id !== setId);
                saveDataToFirebase();
                renderLogEntries();
            } else if (e.target.matches('.stepper-btn')) {
                const setRow = e.target.closest('.set-row');
                const input = setRow.querySelector(`input[data-field="${e.target.dataset.type}"]`);
                const increment = Number(e.target.dataset.increment);
                input.value = Math.max(0, (Number(input.value) || 0) + increment).toString();
                input.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (e.target.matches('.complete-set-btn')) {
                if (restTimerInterval) clearInterval(restTimerInterval);
                const setRow = e.target.closest('.set-row');
                const setId = Number(setRow.dataset.setId);
                activeRestTimer = { setId, startTime: Date.now() };
                renderLogEntries();
                const timerDisplay = workoutLogEntries.querySelector('.rest-timer-inline-time');
                if (timerDisplay) {
                    timerDisplay.textContent = '00:00';
                    restTimerInterval = setInterval(() => {
                        if(activeRestTimer.setId === setId && timerDisplay) {
                           timerDisplay.textContent = formatRestTime(Date.now() - activeRestTimer.startTime);
                        } else {
                            clearInterval(restTimerInterval);
                        }
                    }, 1000);
                }
            } else if (e.target.matches('.dismiss-rest-timer')) {
                if (restTimerInterval) clearInterval(restTimerInterval);
                activeRestTimer = { setId: null, startTime: 0 };
                renderLogEntries();
            }
        });

        workoutLogEntries.addEventListener('input', (e) => {
            const workout = getState().workouts.find(w => w.id === currentWorkoutId);
            if (!workout) return;
            const exerciseCard = e.target.closest('.exercise-card');
            if (!exerciseCard) return;
            const exerciseId = Number(exerciseCard.dataset.exerciseId);
            const exercise = workout.exercises.find(ex => ex.id === exerciseId);
            if (!exercise) return;
            if (e.target.matches('.exercise-name-input')) {
                activeExerciseInput = e.target;
                exercise.name = e.target.value;
                const query = e.target.value.toLowerCase();
                const inputRect = activeExerciseInput.getBoundingClientRect();
                exerciseSearchResults.style.top = `${inputRect.bottom + window.scrollY}px`;
                exerciseSearchResults.style.left = `${inputRect.left + window.scrollX}px`;
                exerciseSearchResults.style.width = `${inputRect.width}px`;
                if (query.length < 1) { exerciseSearchResults.style.display = 'none'; return; }
                const filtered = getState().exercises.filter(ex => ex.name.toLowerCase().includes(query));
                exerciseSearchResults.innerHTML = filtered.map(ex => `<div class="search-result-item">${ex.name}</div>`).join('');
                exerciseSearchResults.style.display = filtered.length > 0 ? 'block' : 'none';
            }
            const setRow = e.target.closest('.set-row');
            if (setRow && e.target.matches('.inline-log-input')) {
                const setId = Number(setRow.dataset.setId);
                const set = exercise.sets.find(s => s.id === setId);
                if (set) set[e.target.dataset.field] = e.target.value;
            }
            saveDataToFirebase();
        });

        workoutLogEntries.addEventListener('blur', (e) => {
             if (e.target.matches('.exercise-name-input')) {
                 setTimeout(() => {
                     if (document.activeElement.closest('.search-result-item')) return;
                     exerciseSearchResults.style.display = 'none';
                     const workout = getState().workouts.find(w => w.id === currentWorkoutId);
                     if (!workout) return;
                     const exerciseCard = e.target.closest('.exercise-card');
                     const exerciseId = Number(exerciseCard.dataset.exerciseId);
                     const exercise = workout.exercises.find(ex => ex.id === exerciseId);
                     if (exercise && !exercise.name.trim()) {
                         workout.exercises = workout.exercises.filter(ex => ex.id !== exerciseId);
                         renderLogEntries();
                     }
                 }, 200);
             }
        }, true);

        exerciseSearchResults.addEventListener('click', (e) => {
            if (e.target.matches('.search-result-item') && activeExerciseInput) {
                const newName = e.target.textContent;
                const exerciseCard = activeExerciseInput.closest('.exercise-card');
                const exerciseId = Number(exerciseCard.dataset.exerciseId);
                const workout = getState().workouts.find(w => w.id === currentWorkoutId);
                const exercise = workout.exercises.find(ex => ex.id === exerciseId);
                if (exercise) {
                    exercise.name = newName;
                    saveDataToFirebase();
                    renderLogEntries();
                }
                exerciseSearchResults.style.display = 'none';
                activeExerciseInput = null;
            }
        });

        calendarPrevWeekBtn.addEventListener('click', () => { calendarViewDate.setDate(calendarViewDate.getDate() - 7); render(); });
        calendarNextWeekBtn.addEventListener('click', () => { calendarViewDate.setDate(calendarViewDate.getDate() + 7); render(); });
        prevWorkoutBtn.addEventListener('click', () => { const s = getState().workouts.sort((a,b)=>new Date(b.date)-new Date(a.date)||(b.startTime||0)-(a.startTime||0)); const i = s.findIndex(w=>w.id===currentWorkoutId); if(i<s.length-1){ selectedDate = s[i+1].date; currentWorkoutId = s[i+1].id; render(); } });
        nextWorkoutBtn.addEventListener('click', () => { const s = getState().workouts.sort((a,b)=>new Date(b.date)-new Date(a.date)||(b.startTime||0)-(a.startTime||0)); const i = s.findIndex(w=>w.id===currentWorkoutId); if(i>0){ selectedDate = s[i-1].date; currentWorkoutId = s[i-1].id; render(); } });
        deleteWorkoutBtn.addEventListener('click', async () => { if (await showConfirmation("Delete this entire workout log?")) { getState().workouts = getState().workouts.filter(w => w.id !== currentWorkoutId); currentWorkoutId = null; saveDataToFirebase(); render(); } });
        finishWorkoutBtn.addEventListener('click', () => { const w = getState().workouts.find(w => w.id === currentWorkoutId); if (w) { w.exercises.forEach(ex => ex.isEditing = false); if (workoutTimerInterval) clearInterval(workoutTimerInterval); if (w.startTime && !w.duration) w.duration = Date.now() - w.startTime; w.isFinished = true; saveDataToFirebase(); render(); } });
        editWorkoutBtn.addEventListener('click', () => { const w = getState().workouts.find(w => w.id === currentWorkoutId); if (w) { w.isFinished = false; w.exercises.forEach(ex => ex.isEditing = true); saveDataToFirebase(); render(); } });
        document.getElementById('edit-bodyweight-btn').addEventListener('click', () => { const w = getState().workouts.find(w => w.id === currentWorkoutId); if (!w) return; const nBw = prompt("Enter new body weight (lbs):", w.bodyweight || ''); if (nBw !== null) { w.bodyweight = parseFloat(nBw) || ''; saveDataToFirebase(); render(); } });
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
        selectedDate = getTodayDateString();
        workoutCategorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        summaryCategorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        renderSummary(summaryCategorySelect.value);
        bindEvents();
    }
    return { init, render };
}