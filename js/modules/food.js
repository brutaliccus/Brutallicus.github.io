// js/modules/food.js
function createFoodModule() {
    // --- MODULE STATE ---
    let db, getState, saveDataToFirebase, getTodayDateString, USDA_API_KEY, calculateCurrentGoals, formatDate;
    let currentFoodLogDate = null;
    let calendarViewDate = new Date();
    let selectedCalendarDate = null;
    let macroChart;
    let html5QrCode;
    let lastSelectedMeal = null;
    // --- CONSTANTS ---
    const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    // --- DOM ELEMENTS ---
    const createFoodLogForm = document.getElementById('create-food-log-form');
    const foodLogDateInput = document.getElementById('food-log-date');
    const currentFoodLogSection = document.getElementById('current-food-log-section');
    const foodLogTitle = document.getElementById('food-log-title');
    const prevFoodLogBtn = document.getElementById('prev-food-log-btn');
    const nextFoodLogBtn = document.getElementById('next-food-log-btn');
    const editFoodLogBtn = document.getElementById('edit-food-log-btn');
    const deleteFoodLogBtn = document.getElementById('delete-food-log-btn');
    const addFoodItemForm = document.getElementById('add-food-item-form');
    const foodItemNameInput = document.getElementById('food-item-name');
    const foodSearchResultsContainer = document.getElementById('food-search-results-container');
    const foodItemMealSelect = document.getElementById('food-item-meal');
    const foodItemFatInput = document.getElementById('food-item-fat');
    const foodItemCarbsInput = document.getElementById('food-item-carbs');
    const foodItemProteinInput = document.getElementById('food-item-protein');
    const foodLogEntries = document.getElementById('food-log-entries');
    const foodLogTotals = document.getElementById('food-log-totals');
    const calorieGoalProgress = document.getElementById('calorie-goal-progress');
    const finishFoodLogBtn = document.getElementById('finish-food-log-btn');
    const foodMacroDetails = document.getElementById('food-macro-details');
    const foodItemQuantityInput = document.getElementById('food-item-quantity');
    const foodItemUnitSelect = document.getElementById('food-item-unit');
    const scannerModal = document.getElementById('scanner-modal');
    const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
    const scannerCloseBtn = document.getElementById('scanner-close-btn');
    const foodCalendarMonthYear = document.getElementById('food-calendar-month-year');
    const foodCalendarDaysGrid = document.getElementById('food-calendar-days-grid');
    const foodCalendarPrevWeekBtn = document.getElementById('food-calendar-prev-week');
    const foodCalendarNextWeekBtn = document.getElementById('food-calendar-next-week');
    // --- HELPER FUNCTIONS ---
    const debounce = (func, delay) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; };
    function toLocalISOString(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    const getMacroColorClass = (current, goal) => {
        if (goal <= 0) return 'macro-default';
        const percentage = (current / goal) * 100;
        if (percentage > 125) return 'macro-red';
        if (percentage >= 75) return 'macro-green';
        if (percentage >= 50) return 'macro-yellow';
        return 'macro-red';
    };
    function getMealForCurrentTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTime = hours + (minutes / 60);
        if (currentTime < 10.5) { return 'Breakfast'; } 
        else if (currentTime < 15.5) { return 'Lunch'; } 
        else if (currentTime < 17.5) { return 'Snack'; } 
        else { return 'Dinner'; }
    }
    function setSmartMealDefault() {
        if (lastSelectedMeal) {
            foodItemMealSelect.value = lastSelectedMeal;
        } else {
            foodItemMealSelect.value = getMealForCurrentTime();
        }
    }
    // --- RENDER FUNCTIONS ---
    function renderFoodCalendar() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const foodLogs = getState().foodLogs;
        const { goals: currentGoals } = calculateCurrentGoals();
        calendarViewDate.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(calendarViewDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        foodCalendarMonthYear.textContent = calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        foodCalendarDaysGrid.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            const dateString = toLocalISOString(day);
            const log = foodLogs[dateString];
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
            if (log && log.items && log.items.length > 0) {
                const totals = log.items.reduce((acc, item) => {
                    acc.calories += Number(item.calories);
                    acc.protein += Number(item.protein);
                    return acc;
                }, { calories: 0, protein: 0 });
                const colorClass = getMacroColorClass(totals.calories, currentGoals.calories);
                const bar = document.createElement('button');
                bar.className = 'food-calendar-bar';
                bar.classList.add(colorClass);
                bar.textContent = `${totals.calories.toFixed(0)} cals | ${totals.protein.toFixed(0)}g P`;
                dayEl.appendChild(bar);
            }
            foodCalendarDaysGrid.appendChild(dayEl);
        }
    }
    function render() { 
        if (!selectedCalendarDate) {
            selectedCalendarDate = getTodayDateString();
        }
        renderFoodCalendar();
        const sortedDates = Object.keys(getState().foodLogs).sort((a, b) => new Date(b) - new Date(a));
        if (!currentFoodLogDate || !getState().foodLogs[currentFoodLogDate]) {
            currentFoodLogDate = getState().foodLogs[selectedCalendarDate] ? selectedCalendarDate : null;
        }
        selectedCalendarDate = currentFoodLogDate || selectedCalendarDate;
        if (currentFoodLogDate && getState().foodLogs[currentFoodLogDate]) {
            currentFoodLogSection.style.display = 'block';
            const log = getState().foodLogs[currentFoodLogDate];
            const isFinished = log.isFinished || false;
            foodLogTitle.textContent = formatDate(currentFoodLogDate);
            const currentIndex = sortedDates.indexOf(currentFoodLogDate);
            prevFoodLogBtn.disabled = currentIndex >= sortedDates.length - 1;
            nextFoodLogBtn.disabled = currentIndex <= 0;
            addFoodItemForm.style.display = isFinished ? 'none' : 'block';
            finishFoodLogBtn.style.display = isFinished ? 'none' : 'block';
            editFoodLogBtn.style.display = isFinished ? 'inline-block' : 'none';
            renderFoodEntries(log.items, isFinished);
            calculateAndRenderTotals(log.items);
        } else {
            currentFoodLogSection.style.display = 'none';
        }
    }
    function populateUniqueFoods() {
        const foodMap = new Map();
        (getState().uniqueFoods || []).forEach(food => {
            if (food && food.name) foodMap.set(food.name.toLowerCase(), food);
        });
        Object.values(getState().foodLogs).forEach(log => {
            (log.items || []).forEach(item => {
                if (item && item.name) {
                    const canonicalName = item.name.replace(/\s\([^)]+\)$/, '').trim();
                    if (!foodMap.has(canonicalName.toLowerCase())) {
                        const baseItem = { name: canonicalName, fat: item.baseFat, carbs: item.baseCarbs, protein: item.baseProtein };
                        foodMap.set(canonicalName.toLowerCase(), baseItem);
                    }
                }
            });
        });
        getState().uniqueFoods = Array.from(foodMap.values());
    }
    const searchByUpc = async (upc) => {
        const url = `https://world.openfoodfacts.org/api/v2/product/${upc}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 0) throw new Error(data.status_verbose);
            const product = data.product;
            const nutrients = product.nutriments;
            const productName = product.product_name || 'Unknown Product';
            const servingSizeString = product.serving_size || '100g';
            const servingGrams = parseFloat(product.serving_quantity) || parseFloat(servingSizeString) || 100;
            const baseFat = nutrients.fat_100g ?? 0;
            const baseCarbs = nutrients.carbohydrates_100g ?? 0;
            const baseProtein = nutrients.proteins_100g ?? 0;
            addFoodItemForm.dataset.foodType = 'upc';
            addFoodItemForm.dataset.foodName = productName;
            addFoodItemForm.dataset.baseFat = baseFat;
            addFoodItemForm.dataset.baseCarbs = baseCarbs;
            addFoodItemForm.dataset.baseProtein = baseProtein;
            addFoodItemForm.dataset.servingGrams = servingGrams;
            foodItemNameInput.value = productName;
            foodSearchResultsContainer.innerHTML = '';
            addFoodItemForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            foodMacroDetails.style.display = 'flex';
            if (nutrients.fat_serving) {
                foodItemQuantityInput.value = 1;
                foodItemUnitSelect.innerHTML = `<option value="serving">serving (${servingSizeString})</option><option value="g">g</option>`;
            } else {
                foodItemQuantityInput.value = 100;
                foodItemUnitSelect.innerHTML = `<option value="g">g</option><option value="serving">serving (${servingSizeString})</option>`;
            }
            handleMacroRecalculation();
        } catch (error) {
            foodSearchResultsContainer.innerHTML = '';
            alert(`UPC Search Error: ${error.message}.`);
            console.error("UPC Fetch Error:", error);
        }
    };
    const debouncedUsdaSearch = debounce(async (query) => {
        const container = foodSearchResultsContainer;
        const loader = document.getElementById('usda-search-loader');
        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=5`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            if (loader) loader.remove();
            if (foodMacroDetails.style.display !== 'none') {
                return;
            }
            if (!data.foods || data.foods.length === 0) {
                if (!container.querySelector('.search-results-header')) {
                    container.innerHTML += '<p class="search-meta-info">No USDA results found.</p>';
                }
                return;
            }
            let usdaResultsHTML = '<h6 class="search-results-header">USDA Database</h6>';
            data.foods.forEach(food => {
                const protein = food.foodNutrients.find(n => n.nutrientNumber === "203")?.value || 0;
                const fat = food.foodNutrients.find(n => n.nutrientNumber === "204")?.value || 0;
                const carbs = food.foodNutrients.find(n => n.nutrientNumber === "205")?.value || 0;
                usdaResultsHTML += `<div class="search-result-item" data-food-type="usda" data-food-name="${food.description}" data-base-fat="${fat}" data-base-carbs="${carbs}" data-base-protein="${protein}"><strong>${food.description}</strong><small>(per 100g) - P: ${protein}g, C: ${carbs}g, F: ${fat}g</small></div>`;
            });
            container.innerHTML += usdaResultsHTML;
        } catch (error) {
            if (loader) loader.remove();
            if (foodMacroDetails.style.display === 'none') {
                container.innerHTML += `<p style="color: var(--danger-color);">Error fetching USDA data.</p>`;
            }
            console.error("USDA API Fetch Error:", error);
        }
    }, 300);
    function renderFoodEntries(items, isFinished) {
        foodLogEntries.innerHTML = '';
        if (!items || items.length === 0) {
            foodLogEntries.innerHTML = '<p>No food logged for this day yet.</p>';
            return;
        }
        const groupedByMeal = items.reduce((acc, item) => {
            (acc[item.meal] = acc[item.meal] || []).push(item);
            return acc;
        }, {});
        MEALS.forEach(meal => {
            if (groupedByMeal[meal]?.length > 0) {
                let mealHTML = `<h4>${meal}</h4>`;
                mealHTML += `<table class="log-table food-log-table"><thead><tr><th>Food</th><th>Fat</th><th>Carbs</th><th>Protein</th><th>Cals</th>${!isFinished ? '<th class="actions-cell">Actions</th>' : ''}</tr></thead><tbody>`;
                groupedByMeal[meal].forEach(item => {
                    mealHTML += `<tr data-entry-id="${item.id}">
                                    <td data-label="Food">${item.name}</td>
                                    <td data-label="Fat">${item.fat}</td>
                                    <td data-label="Carbs">${item.carbs}</td>
                                    <td data-label="Protein">${item.protein}</td>
                                    <td data-label="Cals">${item.calories.toFixed(0)}</td>
                                    ${!isFinished ? `<td class="actions-cell">
                                        <button class="icon-btn edit" title="Edit Entry (Simplified)">&#9998;</button>
                                        <button class="icon-btn delete" title="Delete Entry">&#128465;</button>
                                    </td>` : ''}
                                </tr>`;
                });
                mealHTML += '</tbody></table>';
                foodLogEntries.innerHTML += mealHTML;
            }
        });
    }
    function calculateAndRenderTotals(items) {
        const totals = (items || []).reduce((acc, item) => {
            acc.fat += Number(item.fat);
            acc.carbs += Number(item.carbs);
            acc.protein += Number(item.protein);
            acc.calories += Number(item.calories);
            return acc;
        }, { fat: 0, carbs: 0, protein: 0, calories: 0 });
        const { goals: currentGoals } = calculateCurrentGoals();
        const goalCals = currentGoals.calories || 0;
        calorieGoalProgress.innerHTML = goalCals > 0 ? `<span class="${getMacroColorClass(totals.calories, goalCals)}">${totals.calories.toFixed(0)}</span> / ${goalCals.toFixed(0)} kcal` : '';
        const goalFat = currentGoals.fat || 0;
        const goalCarbs = currentGoals.carbs || 0;
        const goalProtein = currentGoals.protein || 0;
        foodLogTotals.innerHTML = `
            <span class="macro-value">Fat: <span class="${getMacroColorClass(totals.fat, goalFat)}">${totals.fat.toFixed(1)}</span>/${goalFat.toFixed(0)}g</span> |
            <span class="macro-value">Carbs: <span class="${getMacroColorClass(totals.carbs, goalCarbs)}">${totals.carbs.toFixed(1)}</span>/${goalCarbs.toFixed(0)}g</span> |
            <span class="macro-value">Protein: <span class="${getMacroColorClass(totals.protein, goalProtein)}">${totals.protein.toFixed(1)}</span>/${goalProtein.toFixed(0)}g</span>`;
        renderPieChart(totals);
    }
    function renderPieChart(totals) {
        const canvas = document.getElementById('macro-pie-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (macroChart) macroChart.destroy();
        const totalCalories = totals.calories;
        if (totalCalories === 0) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }
        const fatCals = totals.fat * 9, carbCals = totals.carbs * 4, protCals = totals.protein * 4;
        macroChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [`Fat (${(fatCals / totalCalories * 100).toFixed(0)}%)`, `Carbs (${(carbCals / totalCalories * 100).toFixed(0)}%)`, `Protein (${(protCals / totalCalories * 100).toFixed(0)}%)`],
                datasets: [{ data: [fatCals, carbCals, protCals], backgroundColor: ['#FFC107', '#03A9F4', '#F44336'], borderColor: getComputedStyle(document.body).getPropertyValue('--card-background'), borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } } } }
        });
    }
    const onScanSuccess = (decodedText) => { stopScanner(); foodSearchResultsContainer.innerHTML = '<p class="search-meta-info">Searching for UPC...</p>'; searchByUpc(decodedText); };
    const onScanError = () => {};
    const startScanner = () => {
        scannerModal.style.display = 'flex';
        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, onScanSuccess, onScanError)
            .catch(err => { alert("Error: Could not start camera. Please grant permissions."); stopScanner(); });
    };
    const stopScanner = () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.error("Failed to stop scanner.", err));
        }
        scannerModal.style.display = 'none';
    };
    const handleMacroRecalculation = () => {
        const { baseFat, baseCarbs, baseProtein, foodType } = addFoodItemForm.dataset;
        const quantity = parseFloat(foodItemQuantityInput.value) || 0;
        let finalFat, finalCarbs, finalProtein;
        if (foodType === 'local') {
            finalFat = baseFat * quantity; finalCarbs = baseCarbs * quantity; finalProtein = baseProtein * quantity;
        } else {
            const unit = foodItemUnitSelect.value;
            const servingGrams = parseFloat(addFoodItemForm.dataset.servingGrams) || 100;
            const totalGrams = unit === 'g' ? quantity : quantity * servingGrams;
            const multiplier = totalGrams / 100;
            finalFat = baseFat * multiplier; finalCarbs = baseCarbs * multiplier; finalProtein = baseProtein * multiplier;
        }
        foodItemFatInput.value = finalFat.toFixed(1);
        foodItemCarbsInput.value = finalCarbs.toFixed(1);
        foodItemProteinInput.value = finalProtein.toFixed(1);
    };
    function loadFoodLogByDate(dateString) {
        if (getState().foodLogs[dateString]) {
            currentFoodLogDate = dateString;
            render();
            currentFoodLogSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    function bindEvents() {
        foodCalendarPrevWeekBtn.addEventListener('click', () => {
            calendarViewDate.setDate(calendarViewDate.getDate() - 7);
            renderFoodCalendar();
        });
        foodCalendarNextWeekBtn.addEventListener('click', () => {
            calendarViewDate.setDate(calendarViewDate.getDate() + 7);
            renderFoodCalendar();
        });
        foodCalendarDaysGrid.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.calendar-day');
            if (!dayEl) return;
            const dateString = dayEl.dataset.date;
            selectedCalendarDate = dateString;
            foodLogDateInput.value = dateString;
            if (e.target.matches('.food-calendar-bar')) {
                loadFoodLogByDate(dateString);
            } else {
                renderFoodCalendar();
            }
        });
        createFoodLogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = selectedCalendarDate;
            if (!getState().foodLogs[date]) {
                getState().foodLogs[date] = { items: [], isFinished: false };
            }
            currentFoodLogDate = date;
            saveDataToFirebase();
            render();
        });
        prevFoodLogBtn.addEventListener('click', () => { const s = Object.keys(getState().foodLogs).sort((a, b) => new Date(b) - new Date(a)); const c = s.indexOf(currentFoodLogDate); if (c < s.length - 1) { currentFoodLogDate = s[c + 1]; render(); } });
        nextFoodLogBtn.addEventListener('click', () => { const s = Object.keys(getState().foodLogs).sort((a, b) => new Date(b) - new Date(a)); const c = s.indexOf(currentFoodLogDate); if (c > 0) { currentFoodLogDate = s[c - 1]; render(); } });
        deleteFoodLogBtn.addEventListener('click', () => { if (currentFoodLogDate && confirm("Delete this day's food log?")) { delete getState().foodLogs[currentFoodLogDate]; currentFoodLogDate = null; selectedCalendarDate = getTodayDateString(); saveDataToFirebase(); render(); } });
        finishFoodLogBtn.addEventListener('click', () => { const l = getState().foodLogs[currentFoodLogDate]; if (l) { l.isFinished = true; saveDataToFirebase(); render(); } });
        editFoodLogBtn.addEventListener('click', () => { const l = getState().foodLogs[currentFoodLogDate]; if (l) { l.isFinished = false; saveDataToFirebase(); render(); } });
        foodLogEntries.addEventListener('click', (e) => {
            const entryRow = e.target.closest('tr');
            if (!entryRow || !currentFoodLogDate) return;
            const entryId = Number(entryRow.dataset.entryId);
            const log = getState().foodLogs[currentFoodLogDate];
            const isFinished = log.isFinished || false;
            if (isFinished) return;
            const entryIndex = (log.items || []).findIndex(item => item.id === entryId);
            if (entryIndex === -1) return;
            if (e.target.matches('.icon-btn.delete')) {
                if (confirm('Delete food entry?')) { log.items.splice(entryIndex, 1); saveDataToFirebase(); render(); }
            } else if (e.target.matches('.icon-btn.edit')) {
                const item = log.items[entryIndex];
                const newName = prompt('New food name:', item.name);
                const newFat = prompt('New fat (g):', item.fat);
                const newCarbs = prompt('New carbs (g):', item.carbs);
                const newProtein = prompt('New protein (g):', item.protein);
                if (newName !== null) item.name = newName;
                if (newFat !== null) item.fat = parseFloat(newFat) || 0;
                if (newCarbs !== null) item.carbs = parseFloat(newCarbs) || 0;
                if (newProtein !== null) item.protein = parseFloat(newProtein) || 0;
                item.calories = (item.fat * 9) + (item.carbs * 4) + (item.protein * 4);
                saveDataToFirebase();
                render();
            }
        });
        
        // UPDATED: 'blur' event to enable manual entry
        foodItemNameInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (!foodSearchResultsContainer.matches(':hover') && foodItemNameInput.value.trim() !== '') {
                    // If search results are not being hovered and there's text in the input,
                    // assume manual entry and show macro fields.
                    foodSearchResultsContainer.innerHTML = '';
                    addFoodItemForm.dataset.foodType = 'manual'; // Set type to manual
                    foodItemUnitSelect.innerHTML = `<option value="serving">serving</option>`;
                    foodItemQuantityInput.value = 1;
                    foodMacroDetails.style.display = 'flex';
                } else if (!foodSearchResultsContainer.matches(':hover')) {
                    foodSearchResultsContainer.innerHTML = '';
                }
            }, 200);
        });

        foodItemNameInput.addEventListener('input', () => {
            const query = foodItemNameInput.value.trim();
            foodSearchResultsContainer.innerHTML = '';
            foodMacroDetails.style.display = 'none'; // Hide macros while searching
            // Reset dataset for a new search
            delete addFoodItemForm.dataset.foodType; 
            delete addFoodItemForm.dataset.foodName;

            if (query.length < 2) return;
            const isNumeric = /^\d+$/.test(query);
            const isUpcLength = [8, 12, 13, 14].includes(query.length);
            if (isNumeric && isUpcLength) {
                foodSearchResultsContainer.innerHTML = `<div class="search-result-item upc-result" data-upc="${query}"><strong style="color:var(--primary-color);">Search for UPC: ${query}</strong></div>`;
                return;
            }
            const lowerCaseQuery = query.toLowerCase();
            let localResultsHTML = '';
            const filteredLocal = getState().uniqueFoods.filter(food => food.name.toLowerCase().includes(lowerCaseQuery));
            if (filteredLocal.length > 0) {
                localResultsHTML += '<h6 class="search-results-header">My Foods</h6>';
                filteredLocal.forEach(food => { localResultsHTML += `<div class="search-result-item" data-food-type="local" data-food-name="${food.name}"><span>${food.name}</span><button class="icon-btn delete" title="Delete Saved Food" data-food-name-delete="${food.name}">&#128465;</button></div>`; });
            }
            foodSearchResultsContainer.innerHTML = localResultsHTML;
            foodSearchResultsContainer.innerHTML += `<div id="usda-search-loader" class="search-meta-info"><p>Searching USDA database...</p></div>`;
            debouncedUsdaSearch(lowerCaseQuery);
        });
        foodSearchResultsContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.icon-btn.delete');
            if (deleteBtn) {
                e.stopPropagation();
                const foodNameToDelete = deleteBtn.dataset.foodNameDelete;
                if (confirm(`Permanently delete "${foodNameToDelete}"?`)) {
                    getState().uniqueFoods = getState().uniqueFoods.filter(food => food.name !== foodNameToDelete);
                    saveDataToFirebase();
                    foodItemNameInput.dispatchEvent(new Event('input'));
                }
                return;
            }
            const resultItem = e.target.closest('.search-result-item');
            if (!resultItem) return;
            if (resultItem.classList.contains('upc-result')) {
                searchByUpc(resultItem.dataset.upc);
                return;
            }
            const { foodType, foodName, baseFat, baseCarbs, baseProtein } = resultItem.dataset;
            addFoodItemForm.dataset.baseFat = baseFat || 0;
            addFoodItemForm.dataset.baseCarbs = baseCarbs || 0;
            addFoodItemForm.dataset.baseProtein = baseProtein || 0;
            addFoodItemForm.dataset.foodName = foodName;
            addFoodItemForm.dataset.foodType = foodType;
            foodItemNameInput.value = foodName;
            foodSearchResultsContainer.innerHTML = '';
            foodMacroDetails.style.display = 'flex';
            if (foodType === 'local') {
                const food = getState().uniqueFoods.find(f => f.name === foodName);
                if (food) {
                    addFoodItemForm.dataset.baseFat = food.fat;
                    addFoodItemForm.dataset.baseCarbs = food.carbs;
                    addFoodItemForm.dataset.baseProtein = food.protein;
                    addFoodItemForm.dataset.servingGrams = 1;
                    foodItemUnitSelect.innerHTML = `<option value="serving">serving</option>`;
                    foodItemQuantityInput.value = 1;
                }
            } else if (foodType === 'usda') {
                addFoodItemForm.dataset.servingGrams = 100;
                foodItemUnitSelect.innerHTML = `<option value="g">g</option>`;
                foodItemQuantityInput.value = 100;
            }
            handleMacroRecalculation();
        });

        // UPDATED: Submit handler now supports 'manual' food type
        addFoodItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentFoodLogDate) return;
            const displayName = foodItemNameInput.value.trim();
            const foodType = addFoodItemForm.dataset.foodType;

            if (!displayName) {
                alert("Please enter a name for the food.");
                return;
            }
            
            // Allow submission if it's a known type OR a manual entry with macros filled
            if (!foodType && (foodItemFatInput.value === '' || foodItemCarbsInput.value === '' || foodItemProteinInput.value === '')) {
                 alert("Please search for and select a food, or fill in the macros manually.");
                 return;
            }

            const fat = parseFloat(foodItemFatInput.value) || 0;
            const carbs = parseFloat(foodItemCarbsInput.value) || 0;
            const protein = parseFloat(foodItemProteinInput.value) || 0;
            
            let finalName = displayName;
            if(foodType !== 'manual') {
                finalName = `${displayName} (${foodItemQuantityInput.value} ${foodItemUnitSelect.value})`;
            }

            const newItem = {
                id: Date.now(),
                name: finalName,
                meal: foodItemMealSelect.value,
                fat, carbs, protein,
                calories: (fat * 9) + (carbs * 4) + (protein * 4),
                baseFat: foodType !== 'manual' ? (addFoodItemForm.dataset.baseFat || 0) : fat,
                baseCarbs: foodType !== 'manual' ? (addFoodItemForm.dataset.baseCarbs || 0) : carbs,
                baseProtein: foodType !== 'manual' ? (addFoodItemForm.dataset.baseProtein || 0) : protein,
            };

            (getState().foodLogs[currentFoodLogDate].items = getState().foodLogs[currentFoodLogDate].items || []).push(newItem);
            
            const canonicalName = foodType !== 'manual' ? addFoodItemForm.dataset.foodName : displayName;
            const isNewUnique = !getState().uniqueFoods.some(food => food.name.toLowerCase() === canonicalName.toLowerCase());

            if (isNewUnique) {
                getState().uniqueFoods.push({ 
                    name: canonicalName, 
                    fat: newItem.baseFat, 
                    carbs: newItem.baseCarbs, 
                    protein: newItem.baseProtein 
                });
            }

            saveDataToFirebase();
            render();
            addFoodItemForm.reset();
            setSmartMealDefault();
            foodMacroDetails.style.display = 'none';
            foodItemNameInput.focus();
        });
        
        foodItemQuantityInput.addEventListener('input', handleMacroRecalculation);
        foodItemUnitSelect.addEventListener('change', handleMacroRecalculation);
        scanBarcodeBtn.addEventListener('click', startScanner);
        scannerCloseBtn.addEventListener('click', stopScanner);
        
        foodItemMealSelect.addEventListener('change', () => {
            lastSelectedMeal = foodItemMealSelect.value;
        });
    }
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        getTodayDateString = api.getTodayDateString;
        USDA_API_KEY = api.USDA_API_KEY;
        calculateCurrentGoals = api.calculateCurrentGoals;
        formatDate = api.formatDate;
        selectedCalendarDate = getTodayDateString();
        foodLogDateInput.value = selectedCalendarDate;
        html5QrCode = new Html5Qrcode("barcode-reader");
        bindEvents();
        setSmartMealDefault();
        populateUniqueFoods();
    }
    return {
        init,
        render
    };
}
