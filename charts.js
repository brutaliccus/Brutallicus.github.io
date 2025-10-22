document.addEventListener('DOMContentLoaded', () => {
    //retrieve information about the user
    let userString = localStorage.getItem('currentUser');
    let currentUser = null;

    //Check if user is logged in
    if (userString != null) {
        currentUser = localStorage.getItem('currentUser');
    }

    //Retrieve elements from the page
    const calorieChartCanvas = document.getElementById('calorie-chart').getContext('2d');
    const proteinChartCanvas = document.getElementById('protein-chart').getContext('2d');
    const backToLog = document.querySelector('.backToLog');

    let calorieChart, proteinChart;

    let dailyMacros = {};
    //Retrieve data
    function loadUserData() {
        const dailyMacros = localStorage.getItem(`user_${currentUser}`)
        let parsedObject = JSON.parse(dailyMacros);
        parsedObject = parsedObject.dailyMacros;

        if (currentUser) {
            updateCharts(parsedObject);

        } else {
            updateCharts({})
        }
    }

    //Update Charts function
    function updateCharts(parsedObject) {
        const dates = Object.keys(parsedObject);
        const calorieData = dates.map(date => {
            const fat = parsedObject[date].fat || 0;
            const protein = parsedObject[date].protein || 0;
            const carbs = parsedObject[date].carbs || 0;
            return (fat * 9) + (protein * 4) + (carbs * 4);
        });

        const proteinData = dates.map(date => parsedObject[date].protein || 0);

        if (calorieChart) {
            calorieChart.destroy();
        }
        if (proteinChart) {
            proteinChart.destroy();
        }

        calorieChart = new Chart(calorieChartCanvas, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Calories',
                    data: calorieData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        proteinChart = new Chart(proteinChartCanvas, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Protein Intake (g)',
                    data: proteinData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    loadUserData();

    backToLog.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});