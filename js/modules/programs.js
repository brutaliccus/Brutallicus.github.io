function createProgramsModule() {
    let programsTab;
    let programListContainer;
    let programDetailContainer;

    function renderProgramDetails(program) {
        let detailsHTML = `
            <h3>${program.name}</h3>
            <p><strong>Frequency:</strong> ${program.frequency}</p>
            <p>${program.description}</p>
        `;

        program.workouts.forEach(workout => {
            detailsHTML += `<h4>${workout.name}</h4>`;
            // Use a simple div container instead of a table
            detailsHTML += '<div class="program-exercise-list">'; 
            workout.exercises.forEach(ex => {
                // Each exercise is a row, which will be a grid container
                detailsHTML += `
                    <div class="program-exercise-row">
                        <span>${ex.name}</span>
                        <span>${ex.sets_reps}</span>
                    </div>
                `;
            });
            detailsHTML += '</div>';
        });

        if (program.notes) {
            detailsHTML += `<div class="program-notes">${program.notes}</div>`;
        }

        programDetailContainer.innerHTML = detailsHTML;
    }

    function bindEvents() {
        programListContainer.addEventListener('click', (e) => {
            const programItem = e.target.closest('.program-list-item');
            if (programItem) {
                programListContainer.querySelectorAll('.program-list-item').forEach(item => item.classList.remove('active'));
                programItem.classList.add('active');

                const programId = programItem.dataset.programId;
                const selectedProgram = TRAINING_PROGRAMS.find(p => p.id === programId);
                if (selectedProgram) {
                    renderProgramDetails(selectedProgram);
                }
            }
        });
    }

    function render() {
        if (!programsTab.querySelector('.programs-layout')) {
            programsTab.innerHTML = `
                <h2>Training Programs</h2>
                <div class="programs-layout">
                    <div id="program-list" class="program-list-panel card"></div>
                    <div id="program-details" class="program-detail-panel card">
                        <p>Select a program from the list to view its details.</p>
                    </div>
                </div>
            `;
            programListContainer = document.getElementById('program-list');
            programDetailContainer = document.getElementById('program-details');
            bindEvents();
        }
        
        let listHTML = '';
        TRAINING_PROGRAMS.forEach(program => {
            listHTML += `<div class="program-list-item" data-program-id="${program.id}">${program.name}</div>`;
        });
        programListContainer.innerHTML = listHTML;

        if (TRAINING_PROGRAMS.length > 0) {
            // Automatically click the first item to display it by default
            programListContainer.querySelector('.program-list-item')?.click();
        }
    }

    function init() {
        programsTab = document.getElementById('tab-programs');
    }

    return {
        init,
        render
    };
}