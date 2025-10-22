function createExerciseModule() {
    let db, getState, saveDataToFirebase;

    const addExerciseForm = document.getElementById('add-exercise-form');
    const newExerciseNameInput = document.getElementById('new-exercise-name');
    const newExerciseCategorySelect = document.getElementById('new-exercise-category');
    const importCsvBtn = document.getElementById('import-csv-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    const exerciseListLayout = document.getElementById('exercise-list-layout');

    const CATEGORIES = ['Push', 'Pull', 'Legs', 'Other'];

    function renderExercises() {
        if (!exerciseListLayout) return;
        exerciseListLayout.innerHTML = '';
        if (!getState().exercises || getState().exercises.length === 0) {
            exerciseListLayout.innerHTML = '<p>No exercises added yet.</p>';
            return;
        }

        const grouped = getState().exercises.reduce((acc, ex) => {
            if (!ex) return acc;
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
                exerciseListLayout.innerHTML += cardHTML;
            }
        });
    }

    function handleCsvImport(file) {
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

                const isDuplicate = getState().exercises.some(ex => ex.name.toLowerCase() === name.toLowerCase());
                if (name && !isDuplicate) {
                    getState().exercises.push({ id: Date.now() + importedCount, name, category });
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                saveDataToFirebase();
                renderExercises();
                alert(`${importedCount} new exercises were imported.`);
            } else {
                alert('No new, unique exercises were found in the CSV to import.');
            }
            csvFileInput.value = '';
        };
        reader.readAsText(file);
    }

    function bindEvents() {
        addExerciseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = newExerciseNameInput.value.trim();
            const category = newExerciseCategorySelect.value;
            if (name) {
                getState().exercises.push({ id: Date.now(), name, category });
                saveDataToFirebase();
                renderExercises();
                addExerciseForm.reset();
            }
        });

        exerciseListLayout.addEventListener('click', (e) => {
            const exerciseItem = e.target.closest(".exercise-item");
            if (!exerciseItem) return;
            const exerciseId = exerciseItem.dataset.id;
            const exercise = getState().exercises.find(ex => String(ex.id) === exerciseId);

            if (e.target.matches(".icon-btn.delete")) {
                if (confirm(`Are you sure you want to delete "${exercise.name}"?`)) {
                    getState().exercises = getState().exercises.filter(ex => String(ex.id) !== exerciseId);
                    saveDataToFirebase();
                    renderExercises();
                }
            } else if (e.target.matches(".icon-btn.edit")) {
                const newName = prompt("Enter new name:", exercise.name);
                if (newName && newName.trim()) {
                    exercise.name = newName.trim();
                    saveDataToFirebase();
                    renderExercises();
                }
            }
        });

        importCsvBtn.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', (e) => handleCsvImport(e.target.files[0]));
    }

    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;

        let categoryOptions = '';
        CATEGORIES.forEach(cat => categoryOptions += `<option value="${cat}">${cat}</option>`);
        newExerciseCategorySelect.innerHTML = categoryOptions;

        bindEvents();
    }

    return {
        init,
        render: renderExercises
    };
}
