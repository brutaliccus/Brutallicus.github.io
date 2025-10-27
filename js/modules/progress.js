// js/modules/progress.js
function createProgressModule() {
    let db, getState, calculateCurrentGoals, formatDate;
    let caloriesChart, proteinChart, weightChart;

    const myProgressTab = document.getElementById('tab-my-progress');

    function renderLineChart(canvasId, chartInstance, labels, data, label, color, goalValue) {
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
    const sortedFoodDates = Object.keys(getState().foodLogs).sort((a, b) => new Date(a) - new Date(b));
    const foodLabels = sortedFoodDates.map(date => formatDate(date));

    // THIS IS THE FIX: Using `Number(...) || 0` to prevent NaN errors
    const calorieData = sortedFoodDates.map(date =>
        (getState().foodLogs[date].items || []).reduce((sum, item) => sum + (Number(item.calories) || 0), 0)
    );
    const proteinData = sortedFoodDates.map(date =>
        (getState().foodLogs[date].items || []).reduce((sum, item) => sum + (Number(item.protein) || 0), 0)
    );

    const weightEntries = getState().workouts.filter(w => w.bodyweight && w.bodyweight > 0).sort((a, b) => new Date(a.date) - new Date(b.date));
    const weightLabels = weightEntries.map(w => formatDate(w.date));
    // Also made this more robust with parseFloat
    const weightData = weightEntries.map(w => parseFloat(w.bodyweight));

    const { goals: currentGoals } = calculateCurrentGoals();
    const goalWeight = parseFloat(getState().about.goalWeight) || 0;

    caloriesChart = renderLineChart('calories-chart', caloriesChart, foodLabels, calorieData, 'Total Calories', 'rgba(255, 99, 132, 1)', currentGoals.calories || 0);
    proteinChart = renderLineChart('protein-chart', proteinChart, foodLabels, proteinData, 'Protein (g)', 'rgba(54, 162, 235, 1)', currentGoals.protein || 0);
    weightChart = renderLineChart('weight-chart', weightChart, weightLabels, weightData, 'Body Weight (lbs)', 'rgba(75, 192, 192, 1)', goalWeight);
}
    
    function bindEvents() {
        myProgressTab.addEventListener('click', (e) => {
            if (e.target.matches('.reset-zoom-btn')) {
                const chartId = e.target.dataset.chartId;
                if (chartId === 'calories-chart' && caloriesChart) caloriesChart.resetZoom();
                else if (chartId === 'protein-chart' && proteinChart) proteinChart.resetZoom();
                else if (chartId === 'weight-chart' && weightChart) weightChart.resetZoom();
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
        render: renderProgressCharts
    };
}
