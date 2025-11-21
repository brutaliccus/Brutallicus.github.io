// js/modules/progress.js (V6 - Detailed Nutrition Debugging)
function createProgressModule() {
    // --- MODULE STATE AND REFERENCES ---
    let db, getState, calculateCurrentGoals, formatDate;
    let caloriesChart, proteinChart, weightChart;
    let weekOffset = 0; // 0 for this week, -1 for last week, etc.

    const myProgressTab = document.getElementById('tab-my-progress');
    const weekDisplay = document.getElementById('week-display');
    const weekNavPrev = document.getElementById('week-nav-prev');
    const weekNavNext = document.getElementById('week-nav-next');
    
    // --- HELPER FUNCTIONS ---
    
    function getWeekDates(offset = 0) {
    const toYYYYMMDD = (d) => d.toISOString().split('T')[0];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    
    // CORRECTED: This now calculates the start of the week from Sunday.
    const diff = today.getDate() - dayOfWeek + (offset * 7);
    
    const startOfWeek = new Date(today.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    let display;
    if (offset === 0) {
        display = "This Week";
    } else if (offset === -1) {
        display = "Last Week";
    } else {
        const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        // The end of the week is 6 days after the start (e.g., Sunday to Saturday)
        const endStrDate = new Date(startOfWeek);
        endStrDate.setDate(startOfWeek.getDate() + 6);
        const endStr = endStrDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        display = `${startStr} - ${endStr}`;
    }
    
    return {
        start: toYYYYMMDD(startOfWeek),
        end: toYYYYMMDD(endOfWeek),
        display
    };
}
    
    const getMacroColorClass = (current, goal) => {
        if (goal <= 0) return 'macro-default';
        const percentage = (current / goal) * 100;
        if (percentage > 115) return 'macro-red';
        if (percentage >= 85) return 'macro-green';
        return 'macro-yellow';
    };

    const migrateExerciseData = (exercises) => {
        if (!exercises || !Array.isArray(exercises) || exercises.length === 0) return [];
        const firstValidItem = exercises.find(ex => ex);
        if (!firstValidItem || Array.isArray(firstValidItem.sets)) return exercises;
        const map = new Map();
        exercises.forEach(old => {
            if(!old.name) return;
            if(!map.has(old.name)) map.set(old.name, { id: old.id || Date.now()+Math.random(), name: old.name, isEditing: false, sets:[] });
            const ex = map.get(old.name);
            for(let i=0; i < (parseInt(old.sets,10)||1); i++) ex.sets.push({id: Date.now()+Math.random(), weight: old.weight||'', reps: old.reps||''});
        });
        return Array.from(map.values());
    };

    // --- RENDER FUNCTIONS ---

    function renderWeekNavigator() {
        const weekInfo = getWeekDates(weekOffset);
        if (weekDisplay) weekDisplay.textContent = weekInfo.display;
        if (weekNavNext) weekNavNext.disabled = weekOffset >= 0;
    }

    function renderWeeklySetVolume() {
    const setVolumeList = document.getElementById('set-volume-list');
    if (!setVolumeList) return;

    const { start, end } = getWeekDates(weekOffset);
    const weeklyWorkouts = getState().workouts.filter(w => w.date >= start && w.date < end);
    
    const muscleCounts = new Map();
    // Create a lookup map from the main exercise library for efficiency
    const exerciseLibraryMap = new Map(getState().exercises.map(ex => [ex.name.toLowerCase(), ex]));

    weeklyWorkouts.forEach(workout => {
        if (!workout.exercises) return;

        // Loop through the top-level exercise cards (e.g., superset groups)
        workout.exercises.forEach(exerciseGroup => {
            if (!exerciseGroup.subExercises) return;

            // **THE FIX IS HERE**: Loop through the sub-exercises within the group
            exerciseGroup.subExercises.forEach(subEx => {
                // Find the full exercise details in our library lookup map
                const masterExercise = exerciseLibraryMap.get(subEx.name.toLowerCase());
                
                // If we found the exercise in the library and it has sets...
                if (masterExercise && masterExercise.primaryMuscle && subEx.sets) {
                    
                    // Only count non-warmup sets towards volume
                    const numWorkingSets = subEx.sets.filter(s => !s.isWarmup).length;

                    if (numWorkingSets > 0) {
                        const currentCount = muscleCounts.get(masterExercise.primaryMuscle) || 0;
                        muscleCounts.set(masterExercise.primaryMuscle, currentCount + numWorkingSets);
                    }
                }
            });
        });
    });

    if (muscleCounts.size === 0) {
        setVolumeList.innerHTML = `<p>No working sets logged for this time period.</p>`;
        return;
    }
    
    const sortedMuscles = [...muscleCounts.entries()].sort((a, b) => b[1] - a[1]);
    setVolumeList.innerHTML = sortedMuscles.map(([muscle, count]) => `
        <div class="set-volume-item">
            <span class="muscle-name">${muscle}</span>
            <span class="set-count">${count} <small>sets</small></span>
        </div>
    `).join('');
}

    /**
     * MODIFIED: This function now displays the components of the average calculation.
     */
    function renderWeeklyNutrition() {
        const listEl = document.getElementById('nutrition-summary-list');
        if (!listEl) return;

        const { start, end } = getWeekDates(weekOffset);
        const allFoodLogs = getState().foodLogs;
        const weeklyLogDates = Object.keys(allFoodLogs).filter(date => date >= start && date < end);

        let totalCalories = 0;
        let totalProtein = 0;

        weeklyLogDates.forEach(date => {
            const log = allFoodLogs[date];
            if (log && log.items) {
                log.items.forEach(item => {
                    totalCalories += Number(item.calories) || 0;
                    totalProtein += Number(item.protein) || 0;
                });
            }
        });

        const daysWithLogs = weeklyLogDates.length;
        if (daysWithLogs === 0) {
            listEl.innerHTML = `
                <div class="nutrition-summary-item"><span>Avg. Daily Calories:</span> <span>-</span></div>
                <div class="nutrition-summary-item"><span>Avg. Daily Protein:</span> <span>-</span></div>`;
            return;
        }

        const avgCalories = totalCalories / daysWithLogs;
        const avgProtein = totalProtein / daysWithLogs;

        const { goals: currentGoals } = calculateCurrentGoals();
        const calorieColorClass = getMacroColorClass(avgCalories, currentGoals.calories);
        const proteinColorClass = getMacroColorClass(avgProtein, currentGoals.protein);

        listEl.innerHTML = `
            <div class="nutrition-summary-item">
                <span>Avg. Daily Calories:</span>
                <span class="nutrition-summary-value ${calorieColorClass}">
                    ${avgCalories.toFixed(0)}
                </span>
            </div>
            <div class="nutrition-summary-details">
                (Total: ${totalCalories.toFixed(0)} / ${daysWithLogs} days)
            </div>

            <div class="nutrition-summary-item">
                <span>Avg. Daily Protein:</span>
                <span class="nutrition-summary-value ${proteinColorClass}">
                    ${avgProtein.toFixed(0)} g
                </span>
            </div>
            <div class="nutrition-summary-details">
                (Total: ${totalProtein.toFixed(0)}g / ${daysWithLogs} days)
            </div>
        `;
    }

    function renderLineChart(canvasId, chartInstance, labels, data, label, color, goalValue) {
        // ... This function is unchanged
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (chartInstance) chartInstance.destroy();
        const annotation = { annotations: { goalLine: { type: 'line', yMin: goalValue, yMax: goalValue, borderColor: 'rgba(100, 100, 100, 0.8)', borderWidth: 2, borderDash: [6, 6], label: { enabled: true, content: `Goal: ${goalValue.toFixed(0)}`, position: 'end', backgroundColor: 'rgba(100, 100, 100, 0.8)', font: { size: 10 } } } } };
        const chartPlugins = {
            legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } },
            zoom: { pan: { enabled: true, mode: 'xy' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' } },
            ...(goalValue > 0 && { annotation })
        };
        return new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: color.replace('1)', '0.2)'), fill: true, tension: 0.1 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } }, y: { beginAtZero: false, ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } } },
                plugins: chartPlugins
            }
        });
    }

    function renderProgressCharts() {
        // ... This function is unchanged
        const sortedFoodDates = Object.keys(getState().foodLogs).sort((a, b) => new Date(a) - new Date(b));
        const foodLabels = sortedFoodDates.map(date => formatDate(date));
        const calorieData = sortedFoodDates.map(date =>
            (getState().foodLogs[date].items || []).reduce((sum, item) => sum + (Number(item.calories) || 0), 0)
        );
        const proteinData = sortedFoodDates.map(date =>
            (getState().foodLogs[date].items || []).reduce((sum, item) => sum + (Number(item.protein) || 0), 0)
        );
        const weightEntries = getState().workouts.filter(w => w.bodyweight && w.bodyweight > 0).sort((a, b) => new Date(a.date) - new Date(b.date));
        const weightLabels = weightEntries.map(w => formatDate(w.date));
        const weightData = weightEntries.map(w => parseFloat(w.bodyweight));
        const { goals: currentGoals } = calculateCurrentGoals();
        const goalWeight = parseFloat(getState().about.goalWeight) || 0;
        caloriesChart = renderLineChart('calories-chart', caloriesChart, foodLabels, calorieData, 'Total Calories', 'rgba(255, 99, 132, 1)', currentGoals.calories || 0);
        proteinChart = renderLineChart('protein-chart', proteinChart, foodLabels, proteinData, 'Protein (g)', 'rgba(54, 162, 235, 1)', currentGoals.protein || 0);
        weightChart = renderLineChart('weight-chart', weightChart, weightLabels, weightData, 'Body Weight (lbs)', 'rgba(75, 192, 192, 1)', goalWeight);
    }
    
    function render() {
        try {
            renderWeekNavigator();
            renderWeeklySetVolume();
            renderWeeklyNutrition();
        } catch (error) {
            console.error("Error rendering weekly summaries:", error);
        }
        
        try {
            renderProgressCharts();
        } catch (error) {
            console.error("Error rendering progress charts:", error);
        }
    }

    function bindEvents() {
        myProgressTab.addEventListener('click', (e) => {
            if (e.target.matches('.reset-zoom-btn')) {
                const chartId = e.target.dataset.chartId;
                if (chartId === 'calories-chart' && caloriesChart) caloriesChart.resetZoom();
                else if (chartId === 'protein-chart' && proteinChart) proteinChart.resetZoom();
                else if (chartId === 'weight-chart' && weightChart) weightChart.resetZoom();
            }
            if (e.target === weekNavPrev) {
                weekOffset--;
                render();
            }
            if (e.target === weekNavNext) {
                if (weekOffset < 0) {
                    weekOffset++;
                    render();
                }
            }
        });
    }

    function init(api) {
        db = api.db;
        getState = api.getState;
        calculateCurrentGoals = api.calculateCurrentGoals;
        formatDate = api.formatDate;
        bindEvents();
    }

    return {
        init,
        render
    };
}