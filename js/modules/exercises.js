function createExerciseModule() {
    // --- 1. MODULE SCOPE & REFERENCES ---
    let db, getState, saveDataToFirebase, showConfirmation;

    // A comprehensive list of muscle groups for autocomplete
    const MUSCLE_GROUPS = [
        'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
        'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Traps', 'Lats'
    ];

    // DOM Elements
    const addExerciseForm = document.getElementById('add-exercise-form');
    const newExerciseNameInput = document.getElementById('new-exercise-name');
    const newExercisePrimaryInput = document.getElementById('new-exercise-primary');
    const newExerciseSecondaryInput = document.getElementById('new-exercise-secondary');
    
    const importCsvBtn = document.getElementById('import-csv-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    const exerciseListContainer = document.getElementById('exercise-list-container');
    
    // Edit Modal Elements
    const editModal = document.getElementById('edit-exercise-modal');
    const editForm = document.getElementById('edit-exercise-form');
    const editIdInput = document.getElementById('edit-exercise-id');
    const editNameInput = document.getElementById('edit-exercise-name');
    const editPrimaryInput = document.getElementById('edit-exercise-primary');
    const editSecondaryInput = document.getElementById('edit-exercise-secondary');
    const editCancelBtn = document.getElementById('edit-exercise-cancel-btn');

    // --- 2. RENDER FUNCTION ---
    function render() {
    if (!exerciseListContainer) return;

    const exercises = getState().exercises;
    if (!exercises || exercises.length === 0) {
        exerciseListContainer.innerHTML = '<p>No exercises added yet. Add one above to get started!</p>';
        return;
    }

    // --- NEW LOGIC: Group exercises by their primary muscle ---
    const groupedExercises = {};
    exercises.forEach(ex => {
        // Use 'Uncategorized' as a fallback for old or incomplete data
        const primaryMuscle = ex.primaryMuscle || 'Uncategorized';
        if (!groupedExercises[primaryMuscle]) {
            groupedExercises[primaryMuscle] = [];
        }
        groupedExercises[primaryMuscle].push(ex);
    });

    // Get a sorted list of the muscle group keys to render them alphabetically
    const sortedGroups = Object.keys(groupedExercises).sort();

    // --- NEW LOGIC: Build the HTML by iterating through the groups ---
    let finalHTML = '';
    sortedGroups.forEach(muscleGroup => {
        // Sort exercises within each group alphabetically
        groupedExercises[muscleGroup].sort((a, b) => a.name.localeCompare(b.name));

        const cardsHTML = groupedExercises[muscleGroup].map(ex => {
            const primary = ex.primaryMuscle || `<i style="color:var(--warning-color);">Not set</i>`;
            const secondary = Array.isArray(ex.secondaryMuscles) && ex.secondaryMuscles.length > 0
                ? ex.secondaryMuscles.join(', ')
                : 'None';

            return `
                <div class="card exercise-item" data-id="${ex.id}">
                    <div class="exercise-display-header">
                        <h4>${ex.name}</h4>
                        <div class="actions">
                            <button class="icon-btn edit" title="Edit Exercise">&#9998;</button>
                            <button class="icon-btn delete" title="Delete Exercise">&#128465;</button>
                        </div>
                    </div>
                    <div class="exercise-display-body">
                        <p><strong>Primary:</strong> ${primary}</p>
                        <p><strong>Secondary:</strong> <span class="secondary-muscles">${secondary}</span></p>
                    </div>
                </div>
            `;
        }).join('');

        // Wrap each group of cards in our "pr-category-group" container for consistent styling
        finalHTML += `
            <div class="pr-category-group">
                <h2>${muscleGroup}</h2>
                <div class="pr-layout">${cardsHTML}</div>
            </div>
        `;
    });

    exerciseListContainer.innerHTML = finalHTML;
}

    // --- 3. MODAL & FORM HANDLING ---
    function openEditModal(exercise) {
        editIdInput.value = exercise.id;
        editNameInput.value = exercise.name;
        // Handle unmigrated data by showing the old 'category' if 'primaryMuscle' doesn't exist yet
        editPrimaryInput.value = exercise.primaryMuscle || exercise.category || '';
        editSecondaryInput.value = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles.join(', ') : '';
        editModal.style.display = 'flex';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        editForm.reset();
    }

    function handleCsvImport(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n').slice(1); // Skip header row
            let importedCount = 0;
            const existingNames = new Set(getState().exercises.map(ex => ex.name.toLowerCase()));

            rows.forEach((row, index) => {
                const columns = row.split(',');
                if (columns.length < 2) return;

                const name = columns[0].trim().replace(/"/g, '');
                const primaryMuscle = columns[1].trim().replace(/"/g, '');
                const secondaryMuscles = (columns[2] || '').trim().replace(/"/g, '').split(';').map(s => s.trim()).filter(Boolean);
                
                if (name && !existingNames.has(name.toLowerCase())) {
                    getState().exercises.push({
                        id: Date.now() + index,
                        name,
                        primaryMuscle,
                        secondaryMuscles
                    });
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                saveDataToFirebase();
                render();
                alert(`${importedCount} new exercises were imported.`);
            } else {
                alert('No new, unique exercises were found in the CSV to import.');
            }
            csvFileInput.value = '';
        };
        reader.readAsText(file);
    }

    // --- 4. EVENT BINDING ---
    function bindEvents() {
        addExerciseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = newExerciseNameInput.value.trim();
            const primaryMuscle = newExercisePrimaryInput.value.trim();
            const secondaryMuscles = newExerciseSecondaryInput.value.split(',').map(s => s.trim()).filter(Boolean);

            if (name && primaryMuscle) {
                getState().exercises.push({ id: Date.now(), name, primaryMuscle, secondaryMuscles });
                saveDataToFirebase();
                render();
                addExerciseForm.reset();
            } else {
                alert('Please provide at least an exercise name and a primary muscle.');
            }
        });

        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = Number(editIdInput.value);
            const exercise = getState().exercises.find(ex => ex.id === id);
            if (exercise) {
                exercise.name = editNameInput.value.trim();
                exercise.primaryMuscle = editPrimaryInput.value.trim();
                exercise.secondaryMuscles = editSecondaryInput.value.split(',').map(s => s.trim()).filter(Boolean);
                delete exercise.category; // Clean up old data property
            }
            saveDataToFirebase();
            render();
            closeEditModal();
        });

        exerciseListContainer.addEventListener('click', async (e) => {
            const exerciseItem = e.target.closest(".exercise-item");
            if (!exerciseItem) return;
            
            const exerciseId = Number(exerciseItem.dataset.id);
            // After migration, all exercises will have a valid ID
            const exercise = getState().exercises.find(ex => ex.id === exerciseId);
            if (!exercise) return; // Should not happen now

            if (e.target.matches(".icon-btn.delete")) {
                const confirmed = await showConfirmation(`Are you sure you want to delete "${exercise.name}"?`);
                if (confirmed) {
                    getState().exercises = getState().exercises.filter(ex => ex.id !== exerciseId);
                    saveDataToFirebase();
                    render();
                }
            } else if (e.target.matches(".icon-btn.edit")) {
                openEditModal(exercise);
            }
        });

        editCancelBtn.addEventListener('click', closeEditModal);
        importCsvBtn.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', (e) => handleCsvImport(e.target.files[0]));
    }

    // --- 5. INITIALIZATION ---
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        showConfirmation = api.showConfirmation;

        const muscleDatalist = document.getElementById('muscle-list-data');
        muscleDatalist.innerHTML = MUSCLE_GROUPS.map(m => `<option value="${m}"></option>`).join('');

        bindEvents();
        render(); // CORRECTED: Call render on init to draw the initial list.
    }

    return {
        init,
        render
    };
}