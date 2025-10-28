// js/modules/workout.js
function createWorkoutModule() {
    // --- 1. MODULE SCOPE VARIABLES & DOM REFERENCES ---
    let db, getState, saveDataToFirebase, switchTab, getTodayDateString, sanitizeNameForId, formatDate, showConfirmation;

    // State
    let currentWorkoutDate = null;
    let calendarViewDate = new Date();
    let selectedCalendarDate = null;
    let workoutTimerInterval = null;
    let restTimerInterval = null;
    let restTimerStartTime = 0;
    let restTimerElapsedTime = 0;
    let isRestTimerPaused = true;
    let activeExerciseInput = null;

    // DOM Elements
    const createWorkoutSection = document.getElementById('create-workout-section');
    const workoutDateInput = document.getElementById('workout-date');
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
    const bodyweightDisplayContainer = document.getElementById('bodyweight-display-container');
    const bodyweightValue = document.getElementById('bodyweight-value');
    const editBodyweightBtn = document.getElementById('edit-bodyweight-btn');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarDaysGrid = document.getElementById('calendar-days-grid');
    const calendarPrevWeekBtn = document.getElementById('calendar-prev-week');
    const calendarNextWeekBtn = document.getElementById('calendar-next-week');
    const workoutTimerDisplay = document.getElementById('workout-timer-display');
    const restTimerDisplay = document.getElementById('rest-timer-display');
    const restTimerStartBtn = document.getElementById('rest-timer-start-btn');
    const restTimerPauseBtn = document.getElementById('rest-timer-pause-btn');

    const CATEGORIES = ['Push', 'Pull', 'Legs', 'Other'];

    // --- 2. HELPER & UTILITY FUNCTIONS ---

    function toLocalISOString(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDuration(ms) {
        if (!ms || ms < 0) return '00:00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    function startTimerDisplay(startTime) {
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        workoutTimerDisplay.style.display = 'inline-flex';
        workoutTimerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            workoutTimerDisplay.querySelector('span').textContent = formatDuration(elapsed);
        }, 1000);
    }

    function formatRestTime(ms) {
        if (!ms || ms < 0) return '00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    function updateRestTimerDisplay() {
        const currentSegmentTime = restTimerStartTime ? Date.now() - restTimerStartTime : 0;
        const totalTime = restTimerElapsedTime + currentSegmentTime;
        restTimerDisplay.textContent = formatRestTime(totalTime);
    }

    // --- 3. RENDER FUNCTIONS ---

    function renderWorkoutCalendar() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const workoutMap = new Map(getState().workouts.map(w => [w.date, w]));

        calendarViewDate.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(calendarViewDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        calendarMonthYear.textContent = calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        calendarDaysGrid.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            const dateString = toLocalISOString(day);
            const workout = workoutMap.get(dateString);

            const isToday = day.getTime() === today.getTime();
            const isSelected = dateString === selectedCalendarDate;
            const isOtherMonth = day.getMonth() !== calendarViewDate.getMonth();

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.date = dateString;
            if (isToday) dayEl.classList.add('is-today');
            if (isSelected) dayEl.classList.add('is-selected');
            if (isOtherMonth) dayEl.classList.add('other-month');

            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day.getDate();
            dayEl.appendChild(dayNumber);

            if (workout) {
                const bar = document.createElement('button');
                bar.className = 'calendar-workout-bar';
                bar.classList.add(`category-${workout.category.toLowerCase()}`);
                bar.textContent = workout.category;
                dayEl.appendChild(bar);
            }
            calendarDaysGrid.appendChild(dayEl);
        }
    }

    function renderLogEntries(exercises, isFinished) {
        workoutLogEntries.innerHTML = '';
        if ((exercises && exercises.length > 0) || !isFinished) {
            workoutLogEntries.innerHTML = `<div class="workout-log-header-row"><span>Exercise</span><span>Weight (lbs)</span><span>Sets</span><span>Reps</span><span class="actions-cell"></span></div>`;
        } else if (exercises.length === 0 && isFinished) {
            workoutLogEntries.innerHTML = '<p>No exercises were logged for this workout.</p>';
        }

        (exercises || []).forEach(entry => {
            const row = document.createElement('div');
            row.className = 'workout-log-entry-row';
            row.dataset.entryId = entry.id;
            if (isFinished) {
                row.innerHTML = `
                    <span>${entry.name || '-'}</span>
                    <span class="center-text">${entry.weight || 0}</span>
                    <span class="center-text">${entry.sets || 0}</span>
                    <span class="center-text">${entry.reps || 0}</span>
                    <div class="actions-cell"></div>`;
            } else {
                row.innerHTML = `
                    <input type="text" class="inline-log-input" data-field="name" placeholder="Exercise Name" value="${entry.name || ''}" autocomplete="off">
                    <input type="number" class="inline-log-input" data-field="weight" placeholder="lbs" value="${entry.weight || ''}">
                    <input type="number" class="inline-log-input" data-field="sets" placeholder="sets" value="${entry.sets || ''}">
                    <input type="number" class="inline-log-input" data-field="reps" placeholder="reps" value="${entry.reps || ''}">
                    <div class="actions-cell">
                        <button class="icon-btn delete-log-row" title="Delete Row">&#128465;</button>
                    </div>`;
            }
            workoutLogEntries.appendChild(row);
        });

        if (!isFinished) {
            const addRow = document.createElement('div');
            addRow.className = 'add-exercise-row';
            addRow.innerHTML = `<button class="add-exercise-btn">+</button>`;
            workoutLogEntries.appendChild(addRow);
        }
    }

    function renderCurrentWorkoutView() {
        const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
        if (!workout) return;

        const sortedWorkouts = getState().workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const currentIndex = sortedWorkouts.findIndex(w => w.date === currentWorkoutDate);

        prevWorkoutBtn.disabled = currentIndex >= sortedWorkouts.length - 1;
        nextWorkoutBtn.disabled = currentIndex <= 0;

        const isFinished = workout.isFinished || false;
        workoutTitle.textContent = `${formatDate(workout.date)} - ${workout.category}`;
        bodyweightValue.textContent = workout.bodyweight;
        bodyweightDisplayContainer.style.display = workout.bodyweight ? 'block' : 'none';

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
        renderLogEntries(workout.exercises, isFinished);
    }

    function renderSummary(category) {
        const today = getTodayDateString();
        const lastWorkout = getState().workouts
            .filter(w => w.category === category && w.date !== today)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        if (!lastWorkout) {
            workoutSummaryContent.innerHTML = '<p>No previous workout found for this category.</p>';
            return;
        }

        let summaryHTML = `<p><strong>${formatDate(lastWorkout.date)}</strong></p>`;
        if (lastWorkout.exercises && lastWorkout.exercises.length > 0) {
            summaryHTML += '<table class="log-table"><thead><tr><th>Exercise</th><th>Weight</th><th>Sets</th><th>Reps</th></tr></thead><tbody>';
            lastWorkout.exercises.forEach(ex => {
                summaryHTML += `<tr> <td>${ex.name}</td> <td>${ex.weight}</td> <td>${ex.sets}</td> <td>${ex.reps}</td> </tr>`;
            });
            summaryHTML += '</tbody></table>';
        } else {
            summaryHTML += '<p>No exercises were logged.</p>';
        }
        workoutSummaryContent.innerHTML = summaryHTML;
    }

    /**
     * =========================================================================
     * CORRECTED RENDER FUNCTION
     * This function now correctly shows/hides only the workout logging section,
     * leaving the top "Create Workout" section with the calendar always visible.
     * =========================================================================
     */
    function render() {
        if (!selectedCalendarDate) {
            selectedCalendarDate = getTodayDateString();
            workoutDateInput.value = selectedCalendarDate;
        }

        // Determine if a workout exists for the selected date
        const workoutExists = getState().workouts.some(w => w.date === selectedCalendarDate);
        currentWorkoutDate = workoutExists ? selectedCalendarDate : null;

        // Always render the calendar
        renderWorkoutCalendar();

        // Now, only toggle the visibility of the workout logging section
        if (currentWorkoutDate) {
            // A workout is selected (or was just created)
            renderCurrentWorkoutView();
            currentWorkoutSection.style.display = 'block';
        } else {
            // No workout is selected for the current day
            if (workoutTimerInterval) clearInterval(workoutTimerInterval);
            currentWorkoutSection.style.display = 'none';
        }
    }


    // --- 4. EVENT BINDING ---

    function bindEvents() {
        startWorkoutBtn.addEventListener('click', () => {
            const date = selectedCalendarDate;
            if (!date) {
                alert("Please select a date from the calendar.");
                return;
            }
            if (getState().workouts.some(w => w.date === date)) {
                alert('A workout for this date already exists.');
                return;
            }
            const newWorkout = {
                date,
                bodyweight: workoutBodyweightInput.value,
                category: workoutCategorySelect.value,
                exercises: [{ id: Date.now(), name: '', weight: '', sets: '', reps: '' }],
                isFinished: false,
                startTime: Date.now()
            };
            getState().workouts.push(newWorkout);
            // currentWorkoutDate is set inside render() now
            saveDataToFirebase();
            render();
        });

        workoutLogEntries.addEventListener('click', async (e) => {
            const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
            if (!workout) return;

            if (e.target.matches('.add-exercise-btn')) {
                workout.exercises.push({ id: Date.now(), name: '', weight: '', sets: '', reps: '' });
                renderLogEntries(workout.exercises, false);
            }

            if (e.target.matches('.delete-log-row')) {
                const confirmed = await showConfirmation("Are you sure you want to delete this exercise row?");
                if (confirmed) {
                    const row = e.target.closest('.workout-log-entry-row');
                    const entryId = Number(row.dataset.entryId);
                    workout.exercises = workout.exercises.filter(ex => ex.id !== entryId);
                    saveDataToFirebase();
                    renderLogEntries(workout.exercises, false);
                }
            }
        });

        deleteWorkoutBtn.addEventListener('click', async () => {
            const confirmed = await showConfirmation("Are you sure you want to delete this entire workout log? This action cannot be undone.");
            if (confirmed) {
                getState().workouts = getState().workouts.filter(w => w.date !== currentWorkoutDate);
                selectedCalendarDate = currentWorkoutDate; // Keep calendar on the day that was deleted
                currentWorkoutDate = null;
                render();
                saveDataToFirebase();
            }
        });
        
        // --- Other Event Listeners ---
        
        // Exercise search logic
        workoutLogEntries.addEventListener('focusin', (e) => {
            if (e.target.matches('.inline-log-input[data-field="name"]')) {
                activeExerciseInput = e.target;
            }
        });
        workoutLogEntries.addEventListener('input', (e) => {
            if (e.target.matches('.inline-log-input[data-field="name"]')) {
                activeExerciseInput = e.target;
                const query = e.target.value.toLowerCase();
                const inputRect = activeExerciseInput.getBoundingClientRect();
                
                exerciseSearchResults.style.top = `${inputRect.bottom + window.scrollY}px`;
                exerciseSearchResults.style.left = `${inputRect.left + window.scrollX}px`;
                exerciseSearchResults.style.width = `${inputRect.width}px`;

                if (query.length < 1) {
                    exerciseSearchResults.style.display = 'none';
                    return;
                }
                
                const filtered = getState().exercises.filter(ex => ex.name.toLowerCase().includes(query));
                exerciseSearchResults.innerHTML = filtered.map(ex => `<div class="search-result-item">${ex.name}</div>`).join('');
                exerciseSearchResults.style.display = filtered.length > 0 ? 'block' : 'none';
            }
        });
        exerciseSearchResults.addEventListener('click', (e) => {
            if (e.target.matches('.search-result-item') && activeExerciseInput) {
                activeExerciseInput.value = e.target.textContent;
                activeExerciseInput.dispatchEvent(new Event('blur', { bubbles: true }));
                exerciseSearchResults.style.display = 'none';
                activeExerciseInput = null;
            }
        });

        // Auto-save on blur from an input
        workoutLogEntries.addEventListener('blur', (e) => {
            if (e.target.matches('.inline-log-input')) {
                const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
                if (!workout) return;
                const row = e.target.closest('.workout-log-entry-row');
                const entryId = Number(row.dataset.entryId);
                const field = e.target.dataset.field;
                const value = e.target.value;
                const exerciseEntry = workout.exercises.find(ex => ex.id === entryId);
                if (exerciseEntry) {
                    exerciseEntry[field] = value;
                    saveDataToFirebase();
                }
            }
            // Hide search results on blur, with a delay to allow clicking an item
            setTimeout(() => { if (!exerciseSearchResults.matches(':hover')) { exerciseSearchResults.style.display = 'none'; } }, 200);
        }, true);
        
        // Calendar navigation
        calendarPrevWeekBtn.addEventListener('click', () => { calendarViewDate.setDate(calendarViewDate.getDate() - 7); render(); });
        calendarNextWeekBtn.addEventListener('click', () => { calendarViewDate.setDate(calendarViewDate.getDate() + 7); render(); });
        calendarDaysGrid.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.calendar-day');
            if (!dayEl) return;
            selectedCalendarDate = dayEl.dataset.date;
            workoutDateInput.value = selectedCalendarDate;
            render();
        });

        // Workout navigation
        prevWorkoutBtn.addEventListener('click', () => { const sorted = getState().workouts.sort((a, b) => new Date(b.date) - new Date(a.date)); const i = sorted.findIndex(w => w.date === currentWorkoutDate); if (i < sorted.length - 1) { selectedCalendarDate = sorted[i + 1].date; render(); } });
        nextWorkoutBtn.addEventListener('click', () => { const sorted = getState().workouts.sort((a, b) => new Date(b.date) - new Date(a.date)); const i = sorted.findIndex(w => w.date === currentWorkoutDate); if (i > 0) { selectedCalendarDate = sorted[i - 1].date; render(); } });
        
        editWorkoutBtn.addEventListener('click', () => { const workout = getState().workouts.find(w => w.date === currentWorkoutDate); if (workout) { workout.isFinished = false; saveDataToFirebase(); render(); } });
        finishWorkoutBtn.addEventListener('click', () => { const workout = getState().workouts.find(w => w.date === currentWorkoutDate); if (workout) { if (workoutTimerInterval) clearInterval(workoutTimerInterval); if (workout.startTime && !workout.duration) workout.duration = Date.now() - workout.startTime; workout.isFinished = true; saveDataToFirebase(); render(); } });
        summaryCategorySelect.addEventListener('change', (e) => renderSummary(e.target.value));
        workoutCategorySelect.addEventListener('change', (e) => { summaryCategorySelect.value = e.target.value; renderSummary(e.target.value); });
        
        editBodyweightBtn.addEventListener('click', () => {
            const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
            if (!workout) return;
            const newBw = prompt("Enter new body weight (lbs):", workout.bodyweight || '');
            if (newBw !== null) {
                workout.bodyweight = parseFloat(newBw) || '';
                saveDataToFirebase();
                render();
            }
        });
        
        // Rest Timer
        restTimerStartBtn.addEventListener('click', () => { if (restTimerInterval) clearInterval(restTimerInterval); isRestTimerPaused = false; restTimerElapsedTime = 0; restTimerStartTime = Date.now(); restTimerPauseBtn.textContent = 'Pause'; updateRestTimerDisplay(); restTimerInterval = setInterval(updateRestTimerDisplay, 1000); });
        restTimerPauseBtn.addEventListener('click', () => { if (isRestTimerPaused) { if (restTimerElapsedTime === 0 && !restTimerStartTime) return; isRestTimerPaused = false; restTimerStartTime = Date.now(); restTimerPauseBtn.textContent = 'Pause'; updateRestTimerDisplay(); restTimerInterval = setInterval(updateRestTimerDisplay, 1000); } else { if (restTimerInterval) clearInterval(restTimerInterval); restTimerElapsedTime += Date.now() - restTimerStartTime; isRestTimerPaused = true; restTimerPauseBtn.textContent = 'Resume'; } });
    }


    // --- 5. INITIALIZATION ---
    
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        switchTab = api.switchTab;
        getTodayDateString = api.getTodayDateString;
        sanitizeNameForId = api.sanitizeNameForId;
        formatDate = api.formatDate;
        showConfirmation = api.showConfirmation; // Grab the new function from the API

        selectedCalendarDate = getTodayDateString();
        workoutDateInput.value = selectedCalendarDate;
        
        workoutCategorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        summaryCategorySelect.innerHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        
        renderSummary(summaryCategorySelect.value);
        bindEvents();
    }

    return { init, render };
}
