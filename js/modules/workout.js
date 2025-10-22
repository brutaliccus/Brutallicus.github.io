function createWorkoutModule() {
    let db, getState, saveDataToFirebase, getTodayDateString;

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
    
    const CATEGORIES = ['Push', 'Pull', 'Legs', 'Other'];
    let currentWorkoutIndex = -1;
    let editingEntryId = null;

    function renderWorkoutLogView() {
        getState().workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (currentWorkoutIndex === -1 && getState().workouts.length > 0) {
            currentWorkoutIndex = 0;
        }

        if (currentWorkoutIndex !== -1 && getState().workouts[currentWorkoutIndex]) {
            currentWorkoutSection.style.display = 'block';
            const workout = getState().workouts[currentWorkoutIndex];
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
            prevWorkoutBtn.disabled = currentWorkoutIndex >= getState().workouts.length - 1;
            nextWorkoutBtn.disabled = currentWorkoutIndex <= 0;
            
            renderWorkoutEntries(workout.exercises);
        } else {
            currentWorkoutSection.style.display = 'none';
        }
        workoutDateInput.value = getTodayDateString();
        renderSummaryView(summaryCategorySelect.value);
    }
    
    function renderWorkoutEntries(entries) {
        workoutLogEntries.innerHTML = '';
        if (!entries || entries.length === 0) {
            workoutLogEntries.innerHTML = '<p>No exercises logged yet.</p>';
            return;
        }
        let tableHTML = '<table class="log-table"><tr><th>Exercise</th><th>Weight</th><th>Sets</th><th>Reps</th><th class="actions-cell"></th></tr>';
        entries.forEach(entry => {
            if (entry.id === editingEntryId) {
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
    }

    function renderSummaryView(category) {
        const today = getTodayDateString();
        const lastWorkout = getState().workouts.find(w => w.category === category && w.date !== today);
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
    }

    function bindEvents() {
        createWorkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = workoutDateInput.value;
            const category = workoutCategorySelect.value;
            const bodyweight = parseFloat(workoutBodyweightInput.value) || null;
            if (getState().workouts.some(w => w.date === date)) {
                alert('A workout for this date already exists.');
                return;
            }
            getState().workouts.push({ id: Date.now(), date, category, bodyweight, exercises: [], isFinished: false });
            currentWorkoutIndex = 0;
            saveDataToFirebase();
            renderWorkoutLogView();
            createWorkoutForm.reset();
            workoutDateInput.value = getTodayDateString();
        });

        prevWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex < getState().workouts.length - 1) { currentWorkoutIndex++; renderWorkoutLogView(); } });
        nextWorkoutBtn.addEventListener('click', () => { if (currentWorkoutIndex > 0) { currentWorkoutIndex--; renderWorkoutLogView(); } });
        deleteWorkoutBtn.addEventListener('click', () => {
            if (currentWorkoutIndex === -1) return;
            if (confirm("Are you sure? This will delete the entire workout log for this day.")) {
                getState().workouts.splice(currentWorkoutIndex, 1);
                saveDataToFirebase();
                currentWorkoutIndex = -1;
                renderWorkoutLogView();
            }
        });
        
        editBodyweightBtn.addEventListener('click', () => {
            if (currentWorkoutIndex === -1) return;
            const workout = getState().workouts[currentWorkoutIndex];
            const newBodyweight = prompt('Enter new body weight (lbs):', workout.bodyweight || '');
            if (newBodyweight === null) return;
            const newBwValue = parseFloat(newBodyweight);
            workout.bodyweight = !isNaN(newBwValue) ? newBwValue : null;
            saveDataToFirebase();
            renderWorkoutLogView();
        });

        searchExerciseInput.addEventListener('input', () => {
            const query = searchExerciseInput.value.toLowerCase();
            searchResultsContainer.innerHTML = '';
            if (query.length < 1) return;
            const filtered = getState().exercises.filter(ex => ex.name.toLowerCase().includes(query));
            filtered.forEach(ex => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = ex.name;
                item.addEventListener('click', () => {
                    searchExerciseInput.value = ex.name;
                    searchResultsContainer.innerHTML = '';
                });
                searchResultsContainer.appendChild(item);
            });
        });

        addLogEntryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const workout = getState().workouts[currentWorkoutIndex];
            if (!workout) return;
            const newEntry = {
                id: Date.now(),
                name: searchExerciseInput.value,
                weight: logWeightInput.value || 0,
                sets: logSetsInput.value || 0,
                reps: logRepsInput.value || 0
            };
            if (!newEntry.name || !getState().exercises.some(ex => ex.name === newEntry.name)) {
                alert('Please select a valid exercise from the list.');
                return;
            }
            workout.exercises = workout.exercises || [];
            workout.exercises.push(newEntry);
            saveDataToFirebase();
            renderWorkoutLogView();
            addLogEntryForm.reset();
            searchExerciseInput.focus();
        });

        workoutLogEntries.addEventListener('click', (e) => {
            const entryRow = e.target.closest("tr");
            if (!entryRow || currentWorkoutIndex === -1) return;
            const entryId = Number(entryRow.dataset.entryId);
            const workout = getState().workouts[currentWorkoutIndex];
            const entryIndex = workout.exercises.findIndex(ex => ex.id === entryId);

            if (e.target.matches('.icon-btn.edit')) { editingEntryId = entryId; renderWorkoutEntries(workout.exercises); }
            if (e.target.matches('.icon-btn.delete')) { if (confirm("Delete this entry?")) { workout.exercises.splice(entryIndex, 1); saveDataToFirebase(); renderWorkoutEntries(workout.exercises); } }
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
                renderWorkoutEntries(workout.exercises);
            }
            if (e.target.matches('.icon-btn.cancel')) { editingEntryId = null; renderWorkoutEntries(workout.exercises); }
        });

        workoutLogEntries.addEventListener('input', (e) => {
            if (!e.target.matches('.edit-exercise-name')) return;
            const query = e.target.value.toLowerCase();
            const resultsContainer = e.target.nextElementSibling;
            resultsContainer.innerHTML = '';
            if (query.length < 1) return;
            const filtered = getState().exercises.filter(ex => ex.name.toLowerCase().includes(query));
            filtered.forEach(ex => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = ex.name;
                item.addEventListener('click', () => { e.target.value = ex.name; resultsContainer.innerHTML = ''; });
                resultsContainer.appendChild(item);
            });
        });

        summaryCategorySelect.addEventListener('change', () => renderSummaryView(summaryCategorySelect.value));
        finishWorkoutBtn.addEventListener('click', () => { const w = getState().workouts[currentWorkoutIndex]; if(w) { w.isFinished = true; saveDataToFirebase(); renderWorkoutLogView(); } });
        editWorkoutBtn.addEventListener('click', () => { const w = getState().workouts[currentWorkoutIndex]; if(w) { w.isFinished = false; saveDataToFirebase(); renderWorkoutLogView(); } });
    }

    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        getTodayDateString = api.getTodayDateString;

        let categoryOptions = '';
        CATEGORIES.forEach(cat => categoryOptions += `<option value="${cat}">${cat}</option>`);
        workoutCategorySelect.innerHTML = categoryOptions;
        summaryCategorySelect.innerHTML = categoryOptions;
        
        bindEvents();
    }
    
    return {
        init,
        render: renderWorkoutLogView
    };
}