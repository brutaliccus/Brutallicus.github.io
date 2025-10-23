// js/modules/workout.js
function createWorkoutModule() {
    // --- MODULE STATE ---
    let db, getState, saveDataToFirebase, switchTab, getTodayDateString, sanitizeNameForId, formatDate;
    let currentWorkoutDate = null;
    let calendarViewDate = new Date();
    let selectedCalendarDate = null;
    let workoutTimerInterval = null;
    let restTimerInterval = null;
    let restTimerStartTime = 0;
    let restTimerElapsedTime = 0;
    let isRestTimerPaused = true;
    // --- DOM ELEMENTS ---
    const createWorkoutForm = document.getElementById('create-workout-form');
    const workoutDateInput = document.getElementById('workout-date');
    const workoutBodyweightInput = document.getElementById('workout-bodyweight');
    const workoutCategorySelect = document.getElementById('workout-category');
    const currentWorkoutSection = document.getElementById('current-workout-section');
    const workoutTitle = document.getElementById('workout-title');
    const prevWorkoutBtn = document.getElementById('prev-workout-btn');
    const nextWorkoutBtn = document.getElementById('next-workout-btn');
    const editWorkoutBtn = document.getElementById('edit-workout-btn');
    const deleteWorkoutBtn = document.getElementById('delete-workout-btn');
    const addLogEntryForm = document.getElementById('add-log-entry-form');
    const searchExerciseInput = document.getElementById('search-exercise-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const logWeightInput = document.getElementById('log-weight');
    const logSetsInput = document.getElementById('log-sets');
    const logRepsInput = document.getElementById('log-reps');
    const workoutLogEntries = document.getElementById('workout-log-entries');
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
    // --- HELPER FUNCTIONS ---
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
    // --- RENDER FUNCTIONS ---
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
    function render() {
        if (!selectedCalendarDate) {
            selectedCalendarDate = getTodayDateString();
        }
        if (currentWorkoutDate === null) {
            const workoutForSelectedDate = getState().workouts.find(w => w.date === selectedCalendarDate);
            if (workoutForSelectedDate) {
                currentWorkoutDate = selectedCalendarDate;
            }
        }
        renderWorkoutCalendar();
        if (currentWorkoutDate) {
            renderCurrentWorkoutView();
            currentWorkoutSection.style.display = 'block';
        } else {
            if (workoutTimerInterval) clearInterval(workoutTimerInterval);
            currentWorkoutSection.style.display = 'none';
        }
    }
    function renderCurrentWorkoutView() {
        const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
        if (!workout) {
            return;
        }
        workoutDateInput.value = workout.date;
        const sortedWorkouts = getState().workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const currentIndex = sortedWorkouts.findIndex(w => w.date === currentWorkoutDate);
        prevWorkoutBtn.disabled = currentIndex >= sortedWorkouts.length - 1;
        nextWorkoutBtn.disabled = currentIndex <= 0;
        const isFinished = workout.isFinished || false;
        workoutTitle.textContent = `${formatDate(workout.date)} - ${workout.category}`;
        if (workout.bodyweight) {
            bodyweightValue.textContent = workout.bodyweight;
            bodyweightDisplayContainer.style.display = 'block';
        } else {
            bodyweightDisplayContainer.style.display = 'none';
        }
        addLogEntryForm.style.display = isFinished ? 'none' : 'block';
        finishWorkoutBtn.style.display = isFinished ? 'none' : 'block';
        editWorkoutBtn.style.display = isFinished ? 'inline-block' : 'none';
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        if (workout.duration) {
            workoutTimerDisplay.querySelector('span').textContent = `Duration: ${formatDuration(workout.duration)}`;
            workoutTimerDisplay.style.display = 'inline-flex';
        } else if (!isFinished && workout.startTime) {
            startTimerDisplay(workout.startTime);
        } else {
            workoutTimerDisplay.style.display = 'none';
        }
        renderLogEntries(workout.exercises, isFinished);
    }
    function renderLogEntries(exercises, isFinished) {
        workoutLogEntries.innerHTML = '';
        if (!exercises || exercises.length === 0) {
            workoutLogEntries.innerHTML = '<p>No exercises logged yet.</p>';
            return;
        }
        let tableHTML = `<table class="log-table"><thead><tr>
                         <th>Exercise</th>
                         <th>Weight (lbs)</th>
                         <th>Sets</th>
                         <th>Reps</th>
                         ${!isFinished ? '<th class="actions-cell">Actions</th>' : ''}
                         </tr></thead><tbody>`;
        exercises.forEach(entry => {
            tableHTML += `
                <tr data-entry-id="${entry.id}">
                    <td data-label="Exercise">${entry.name}</td>
                    <td data-label="Weight">${entry.weight}</td>
                    <td data-label="Sets">${entry.sets}</td>
                    <td data-label="Reps">${entry.reps}</td>
                    ${!isFinished ? `<td class="actions-cell">
                                        <button class="icon-btn edit" title="Edit Entry">&#9998;</button>
                                        <button class="icon-btn delete" title="Delete Entry">&#128465;</button>
                                    </td>` : ''}
                </tr>`;
        });
        tableHTML += '</tbody></table>';
        workoutLogEntries.innerHTML = tableHTML;
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
                summaryHTML += `<tr>
                                    <td data-label="Exercise">${ex.name}</td>
                                    <td data-label="Weight">${ex.weight}</td>
                                    <td data-label="Sets">${ex.sets}</td>
                                    <td data-label="Reps">${ex.reps}</td>
                                </tr>`;
            });
            summaryHTML += '</tbody></table>';
        } else {
            summaryHTML += '<p>No exercises were logged.</p>';
        }
        workoutSummaryContent.innerHTML = summaryHTML;
    }
    // --- LOGIC & EVENT HANDLERS ---
    function bindEvents() {
        calendarPrevWeekBtn.addEventListener('click', () => {
            calendarViewDate.setDate(calendarViewDate.getDate() - 7);
            renderWorkoutCalendar();
        });
        calendarNextWeekBtn.addEventListener('click', () => {
            calendarViewDate.setDate(calendarViewDate.getDate() + 7);
            renderWorkoutCalendar();
        });
        calendarDaysGrid.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.calendar-day');
            if (!dayEl) return;
            const dateString = dayEl.dataset.date;
            selectedCalendarDate = dateString;
            if (e.target.matches('.calendar-workout-bar')) {
                currentWorkoutDate = dateString;
                render();
            } else {
                renderWorkoutCalendar();
            }
        });
        createWorkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = selectedCalendarDate;
            const bodyweight = workoutBodyweightInput.value;
            const category = workoutCategorySelect.value;
            if (getState().workouts.some(w => w.date === date)) {
                alert('A workout for this date already exists.');
                return;
            }
            const newWorkout = { date, bodyweight, category, exercises: [], isFinished: false, startTime: Date.now() };
            getState().workouts.push(newWorkout);
            currentWorkoutDate = date;
            saveDataToFirebase();
            render();
        });
        prevWorkoutBtn.addEventListener('click', () => {
            const sortedWorkouts = getState().workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
            const currentIndex = sortedWorkouts.findIndex(w => w.date === currentWorkoutDate);
            if (currentIndex < sortedWorkouts.length - 1) {
                const newDate = sortedWorkouts[currentIndex + 1].date;
                selectedCalendarDate = newDate;
                currentWorkoutDate = newDate;
                render();
            }
        });
        nextWorkoutBtn.addEventListener('click', () => {
            const sortedWorkouts = getState().workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
            const currentIndex = sortedWorkouts.findIndex(w => w.date === currentWorkoutDate);
            if (currentIndex > 0) {
                const newDate = sortedWorkouts[currentIndex - 1].date;
                selectedCalendarDate = newDate;
                currentWorkoutDate = newDate;
                render();
            }
        });
        deleteWorkoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to delete this entire workout log?")) {
                getState().workouts = getState().workouts.filter(w => w.date !== currentWorkoutDate);
                currentWorkoutDate = null;
                selectedCalendarDate = getTodayDateString();
                saveDataToFirebase();
                render();
            }
        });
        editWorkoutBtn.addEventListener('click', () => {
            const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
            if (workout) {
                workout.isFinished = false;
                saveDataToFirebase();
                render();
            }
        });
        finishWorkoutBtn.addEventListener('click', () => {
            const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
            if (workout) {
                if (workoutTimerInterval) clearInterval(workoutTimerInterval);
                if (workout.startTime && !workout.duration) {
                    workout.duration = Date.now() - workout.startTime;
                }
                workout.isFinished = true;
                saveDataToFirebase();
                render();
            }
        });
        addLogEntryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
            if (!workout) return;
            const newEntry = {
                id: Date.now(),
                name: searchExerciseInput.value,
                weight: logWeightInput.value || 0,
                sets: logSetsInput.value || 0,
                reps: logRepsInput.value || 0,
            };
            if (!getState().exercises.some(ex => ex.name.toLowerCase() === newEntry.name.toLowerCase())) {
                if(!confirm(`"${newEntry.name}" is not in your exercise list. Add it?`)) return;
                getState().exercises.push({ id: Date.now(), name: newEntry.name, category: 'Other' });
            }
            workout.exercises.push(newEntry);
            saveDataToFirebase();
            renderCurrentWorkoutView();
            addLogEntryForm.reset();
            searchExerciseInput.focus();
        });
        searchExerciseInput.addEventListener('input', () => {
            const query = searchExerciseInput.value.toLowerCase();
            searchResultsContainer.innerHTML = '';
            if (query.length < 1) return;
            const filtered = getState().exercises.filter(ex => ex.name.toLowerCase().includes(query));
            filtered.forEach(ex => {
                const div = document.createElement('div');
                div.textContent = ex.name;
                div.classList.add('search-result-item');
                div.addEventListener('click', () => {
                    searchExerciseInput.value = ex.name;
                    searchResultsContainer.innerHTML = '';
                });
                searchResultsContainer.appendChild(div);
            });
        });
        searchExerciseInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (!searchResultsContainer.matches(':hover')) {
                    searchResultsContainer.innerHTML = '';
                }
            }, 200);
        });
        workoutLogEntries.addEventListener('click', (e) => {
            const entryRow = e.target.closest('tr');
            if (!entryRow) return;
            const entryId = Number(entryRow.dataset.entryId);
            const workout = getState().workouts.find(w => w.date === currentWorkoutDate);
            const entryIndex = workout.exercises.findIndex(ex => ex.id === entryId);
            if (entryIndex === -1) return;
            if (e.target.matches('.icon-btn.delete')) {
                workout.exercises.splice(entryIndex, 1);
                saveDataToFirebase();
                renderCurrentWorkoutView();
            } else if (e.target.matches('.icon-btn.edit')) {
                const entry = workout.exercises[entryIndex];
                const newWeight = prompt("Enter new weight:", entry.weight);
                const newSets = prompt("Enter new sets:", entry.sets);
                const newReps = prompt("Enter new reps:", entry.reps);
                if (newWeight !== null) entry.weight = newWeight;
                if (newSets !== null) entry.sets = newSets;
                if (newReps !== null) entry.reps = newReps;
                saveDataToFirebase();
                renderCurrentWorkoutView();
            }
        });
        summaryCategorySelect.addEventListener('change', (e) => renderSummary(e.target.value));

        // NEW: This is the only new code block being added.
        workoutCategorySelect.addEventListener('change', (e) => {
            summaryCategorySelect.value = e.target.value;
            renderSummary(e.target.value);
        });

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
        restTimerStartBtn.addEventListener('click', () => {
            if (restTimerInterval) clearInterval(restTimerInterval);
            isRestTimerPaused = false;
            restTimerElapsedTime = 0;
            restTimerStartTime = Date.now();
            restTimerPauseBtn.textContent = 'Pause';
            updateRestTimerDisplay();
            restTimerInterval = setInterval(updateRestTimerDisplay, 1000);
        });
        restTimerPauseBtn.addEventListener('click', () => {
            if (isRestTimerPaused) {
                if (restTimerElapsedTime === 0 && !restTimerStartTime) return;
                isRestTimerPaused = false;
                restTimerStartTime = Date.now();
                restTimerPauseBtn.textContent = 'Pause';
                updateRestTimerDisplay();
                restTimerInterval = setInterval(updateRestTimerDisplay, 1000);
            } else {
                if (restTimerInterval) clearInterval(restTimerInterval);
                restTimerElapsedTime += Date.now() - restTimerStartTime;
                isRestTimerPaused = true;
                restTimerPauseBtn.textContent = 'Resume';
            }
        });
    }
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        switchTab = api.switchTab;
        getTodayDateString = api.getTodayDateString;
        sanitizeNameForId = api.sanitizeNameForId;
        formatDate = api.formatDate;
        let categoryOptions = '';
        CATEGORIES.forEach(cat => categoryOptions += `<option value="${cat}">${cat}</option>`);
        workoutCategorySelect.innerHTML = categoryOptions;
        summaryCategorySelect.innerHTML = categoryOptions;
        renderSummary(summaryCategorySelect.value);
        bindEvents();
    }
    return { init, render };
}
