// js/modules/food.js (Refactored with Search Module)
function createFoodModule() {
    // --- 1. MODULE SCOPE & REFERENCES ---
    let db, getState, saveDataToFirebase, getTodayDateString, foodApi, calculateCurrentGoals, formatDate, showConfirmation;
    let currentFoodLogDate = null,
        calendarViewDate = new Date(),
        selectedCalendarDate = null,
        macroChart,
        html5QrCode,
        lastSelectedMeal = null;
	const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    // Create a dedicated search module instance for the main food log
    const searchModule = createSearchModule();
    
    // --- 2. DOM ELEMENTS ---
    const createFoodLogSection = document.getElementById('create-food-log-section'),
          createFoodLogForm = document.getElementById('create-food-log-form'),
          foodLogDateInput = document.getElementById('food-log-date'),
          currentFoodLogSection = document.getElementById('current-food-log-section'),
          foodLogTitle = document.getElementById('food-log-title'),
          prevFoodLogBtn = document.getElementById('prev-food-log-btn'),
          nextFoodLogBtn = document.getElementById('next-food-log-btn'),
          editFoodLogBtn = document.getElementById('edit-food-log-btn'),
          deleteFoodLogBtn = document.getElementById('delete-food-log-btn'),
          addFoodItemForm = document.getElementById('add-food-item-form'),
          foodItemNameInput = document.getElementById('food-item-name'),
          foodSearchResultsContainer = document.getElementById('food-search-results-container'),
          foodItemMealSelect = document.getElementById('food-item-meal'),
          foodItemFatInput = document.getElementById('food-item-fat'),
          foodItemCarbsInput = document.getElementById('food-item-carbs'),
          foodItemProteinInput = document.getElementById('food-item-protein'),
          foodLogEntries = document.getElementById('food-log-entries'),
          foodLogTotals = document.getElementById('food-log-totals'),
          calorieGoalProgress = document.getElementById('calorie-goal-progress'),
          finishFoodLogBtn = document.getElementById('finish-food-log-btn'),
          foodMacroDetails = document.getElementById('food-macro-details'),
          foodItemQuantityInput = document.getElementById('food-item-quantity'),
          foodItemUnitSelect = document.getElementById('food-item-unit'),
          scannerModal = document.getElementById('scanner-modal'),
          scanBarcodeBtn = document.getElementById('scan-barcode-btn'),
          scannerCloseBtn = document.getElementById('scanner-close-btn'),
          foodCalendarMonthYear = document.getElementById('food-calendar-month-year'),
          foodCalendarDaysGrid = document.getElementById('food-calendar-days-grid'),
          foodCalendarPrevWeekBtn = document.getElementById('food-calendar-prev-week'),
          foodCalendarNextWeekBtn = document.getElementById('food-calendar-next-week'),
          showCustomFoodModalBtn = document.getElementById('show-custom-food-modal-btn'),
          customFoodModal = document.getElementById('custom-food-modal'),
          customFoodModalCloseBtn = document.getElementById('custom-food-modal-close-btn'),
          customFoodForm = document.getElementById('custom-food-form'),
          customFoodName = document.getElementById('custom-food-name'),
          customServingSize = document.getElementById('custom-serving-size'),
          customFat = document.getElementById('custom-fat'),
          customCarbs = document.getElementById('custom-carbs'),
          customProtein = document.getElementById('custom-protein'),
          customFoodError = document.getElementById('custom-food-error');

    // --- 3. HELPER & RENDER FUNCTIONS ---
    const toLocalISOString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const getMacroColorClass = (current, goal) => {
        if (goal <= 0) return 'macro-default';
        const percentage = (current / goal) * 100;
        if (percentage > 125) return 'macro-red';
        if (percentage >= 75) return 'macro-green';
        if (percentage >= 50) return 'macro-yellow';
        return 'macro-red';
    };
    const getMealForCurrentTime = () => {
        const h = new Date().getHours();
        if (h < 10.5) return 'Breakfast';
        if (h < 15.5) return 'Lunch';
        if (h < 17.5) return 'Snack';
        return 'Dinner';
    };
    const setSmartMealDefault = () => { foodItemMealSelect.value = lastSelectedMeal || getMealForCurrentTime(); };
    const openCustomFoodModal = () => { customFoodModal.style.display = 'flex'; };
    const closeCustomFoodModal = () => {
        customFoodModal.style.display = 'none';
        customFoodForm.reset();
        customFoodError.textContent = '';
    };

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
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.date = dateString;
            if (isToday) dayEl.classList.add('is-today');
            if (isSelected) dayEl.classList.add('is-selected');
            dayEl.innerHTML = `<span class="day-number">${day.getDate()}</span>`;
            if (log && log.items && log.items.length > 0) {
                const totals = log.items.reduce((acc, item) => {
                    acc.calories += Number(item.calories) || 0;
                    acc.protein += Number(item.protein) || 0;
                    return acc;
                }, { calories: 0, protein: 0 });
                const colorClass = getMacroColorClass(totals.calories, currentGoals.calories);
                const bar = document.createElement('button');
                bar.className = 'food-calendar-bar';
                bar.classList.add(colorClass);
                bar.textContent = `${totals.calories.toFixed(0)} c | ${totals.protein.toFixed(0)}g p`;
                dayEl.appendChild(bar);
            }
            foodCalendarDaysGrid.appendChild(dayEl);
        }
    }

    function renderFoodEntries(items, isFinished) {
        foodLogEntries.innerHTML = !items || items.length === 0 ? '<p>No food logged for this day yet.</p>' : '';
        if (!items || items.length === 0) return;
        const groupedByMeal = items.reduce((acc, item) => {
            (acc[item.meal] = acc[item.meal] || []).push(item);
            return acc;
        }, {});
        MEALS.forEach(meal => {
            if (groupedByMeal[meal] && groupedByMeal[meal].length > 0) {
                foodLogEntries.innerHTML += `<h4>${meal}</h4>`;
                const mealItemsContainer = document.createElement('div');
                mealItemsContainer.className = 'food-entries-list';
                groupedByMeal[meal].forEach(item => {
                    const isEditMode = item.isEditing === true;
                    const details = document.createElement('details');
                    details.className = 'food-item-details';
                    details.dataset.entryId = item.id;
                    if (isEditMode) details.open = true;
                    details.innerHTML = `
                        <summary class="food-item-summary">
                            <span class="food-name">${item.name}</span>
                            <span class="food-calories">${Number(item.calories || 0).toFixed(0)} kcal</span>
                        </summary>
                        <div class="food-item-content">
                            <div class="macro-grid">
                                <span>Fat: ${Number(item.fat || 0).toFixed(1)}g</span>
                                <span>Carbs: ${Number(item.carbs || 0).toFixed(1)}g</span>
                                <span>Protein: ${Number(item.protein || 0).toFixed(1)}g</span>
                            </div>
                            ${isEditMode ? (() => {
                                let unitOpts = `<option value="serving" ${item.unit === 'serving' ? 'selected': ''}>serving</option>`;
                                if ((parseFloat(item.servingGrams) || 1) > 1) unitOpts += `<option value="g" ${item.unit === 'g' ? 'selected' : ''}>g</option>`;
                                return `<div class="edit-quantity-form">
                                    <input type="number" class="inline-edit-qty" value="${parseFloat(item.originalQty) || 1}" step="0.1" required>
                                    <select class="inline-edit-unit">${unitOpts}</select>
                                    <button class="icon-btn save" title="Save Quantity">&#10004;</button>
                                    <button class="icon-btn cancel" title="Cancel Edit">&#10006;</button>
                                </div>`;
                            })() : !isFinished ? `
                            <div class="food-item-actions">
                                <button class="icon-btn edit" title="Edit Quantity">&#9998;</button>
                                <button class="icon-btn delete" title="Delete Entry">&#128465;</button>
                            </div>` : ''}
                        </div>`;
                    mealItemsContainer.appendChild(details);
                });
                foodLogEntries.appendChild(mealItemsContainer);
            }
        });
    }

    function calculateAndRenderTotals(items) {
        const totals = (items || []).reduce((acc, item) => {
            acc.fat += Number(item.fat) || 0;
            acc.carbs += Number(item.carbs) || 0;
            acc.protein += Number(item.protein) || 0;
            acc.calories += Number(item.calories) || 0;
            return acc;
        }, { fat: 0, carbs: 0, protein: 0, calories: 0 });
        const { goals: currentGoals } = calculateCurrentGoals();
        const goalCals = currentGoals.calories || 0;
        const goalFat = currentGoals.fat || 0;
        const goalCarbs = currentGoals.carbs || 0;
        const goalProtein = currentGoals.protein || 0;
        calorieGoalProgress.innerHTML = goalCals > 0 ? `<span class="${getMacroColorClass(totals.calories, goalCals)}">${totals.calories.toFixed(0)}</span> / ${goalCals.toFixed(0)} kcal` : '';
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
        const fatCals = totals.fat * 9;
        const carbCals = totals.carbs * 4;
        const protCals = totals.protein * 4;
        const totalCals = fatCals + carbCals + protCals;
        if (totalCals === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }
        macroChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [`Fat (${(fatCals / totalCals * 100).toFixed(0)}%)`, `Carbs (${(carbCals / totalCals * 100).toFixed(0)}%)`, `Protein (${(protCals / totalCals * 100).toFixed(0)}%)`],
                datasets: [{
                    data: [fatCals, carbCals, protCals],
                    backgroundColor: ['#FFC107', '#03A9F4', '#F44336'],
                    borderColor: getComputedStyle(document.body).getPropertyValue('--card-background'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } }
                }
            }
        });
    }

    function render() {
        if (!selectedCalendarDate) selectedCalendarDate = getTodayDateString();
        renderFoodCalendar();
        const logExists = getState().foodLogs[selectedCalendarDate];
        currentFoodLogDate = logExists ? selectedCalendarDate : null;
        if (currentFoodLogDate) {
            currentFoodLogSection.style.display = 'block';
            const log = getState().foodLogs[currentFoodLogDate];
            const isFinished = log.isFinished || false;
            const sortedDates = Object.keys(getState().foodLogs).sort((a, b) => new Date(b) - new Date(a));
            const currentIndex = sortedDates.indexOf(currentFoodLogDate);
            foodLogTitle.textContent = formatDate(currentFoodLogDate);
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
        createFoodLogSection.style.display = 'block';
    }
	    // --- 4. API & FORM HANDLING ---
    function populateAndShowMainForm(foodData) {
        // This function is now the callback for when an item is selected from the search results
        addFoodItemForm.dataset.baseName = foodData.baseName;
        addFoodItemForm.dataset.macrosPer100g = JSON.stringify(foodData.macrosPer100g);
        addFoodItemForm.dataset.servingGrams = foodData.servingGrams;
        
        foodItemNameInput.value = foodData.baseName;
        
        addFoodItemForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        foodItemUnitSelect.innerHTML = `<option value="serving">${foodData.servingUnitName || 'serving'}</option><option value="g">g</option>`;
        foodItemQuantityInput.value = 1;
        foodItemUnitSelect.value = 'serving';
        
        foodMacroDetails.style.display = 'flex';
        handleMacroRecalculation();
    }

    function handleMacroRecalculation() {
        const data = addFoodItemForm.dataset;
        if (!data.macrosPer100g) return;
        const macrosPer100g = JSON.parse(data.macrosPer100g);
        const servingGrams = parseFloat(data.servingGrams);
        const quantity = parseFloat(foodItemQuantityInput.value) || 0;
        const unit = foodItemUnitSelect.value;
        let totalGrams = (unit === 'g') ? quantity : (quantity * servingGrams);
        const multiplier = totalGrams / 100;
        foodItemFatInput.value = ((macrosPer100g.f || 0) * multiplier).toFixed(1);
        foodItemCarbsInput.value = ((macrosPer100g.c || 0) * multiplier).toFixed(1);
        foodItemProteinInput.value = ((macrosPer100g.p || 0) * multiplier).toFixed(1);
    }

    const onScanSuccess = (decodedText) => {
        stopScanner();
        // Trigger the search module with the scanned code
        foodItemNameInput.value = decodedText;
        foodItemNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const startScanner = () => {
        scannerModal.style.display = 'flex';
        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, onScanSuccess, () => {}).catch(err => {
            alert("Error: Could not start camera. Please grant permissions.");
            stopScanner();
        });
    };

    const stopScanner = () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.error("Failed to stop scanner.", err));
        }
        scannerModal.style.display = 'none';
    };

    // This is now only used by the search module if an API call fails
    const handleApiError = (error) => {
        foodSearchResultsContainer.innerHTML += `<p class="search-meta-info" style="color: var(--danger-color);">${error.message}</p>`;
        console.error(error.message, error);
    };

    // --- 5. EVENT BINDING ---
    function bindEvents() {
        // The main input and search results click listeners are now handled by the `searchModule` in `init()`
        
        foodLogEntries.addEventListener('click', async (e) => {
            if (e.target.matches('.icon-btn')) e.preventDefault();
            const entryDetails = e.target.closest('.food-item-details');
            if (!entryDetails || !currentFoodLogDate) return;
            const entryId = Number(entryDetails.dataset.entryId);
            const log = getState().foodLogs[currentFoodLogDate];
            if (!log) return;
            const entry = log.items.find(item => item.id === entryId);
            if (!entry) return;

            if (e.target.matches('.icon-btn.delete')) {
                if (await showConfirmation('Are you sure you want to delete this food entry?')) {
                    log.items = log.items.filter(item => item.id !== entryId);
                    saveDataToFirebase();
                    render();
                }
            } else if (e.target.matches('.icon-btn.edit')) {
                entry.isEditing = true;
                render();
                setTimeout(() => {
                    const newRow = foodLogEntries.querySelector(`[data-entry-id="${entryId}"]`);
                    if (newRow) {
                        newRow.querySelector('.inline-edit-qty').focus();
                        newRow.querySelector('.inline-edit-qty').select();
                    }
                }, 0);
            } else if (e.target.matches('.icon-btn.cancel')) {
                delete entry.isEditing;
                render();
            } else if (e.target.matches('.icon-btn.save')) {
                const newQty = parseFloat(entryDetails.querySelector('.inline-edit-qty').value);
                const newUnit = entryDetails.querySelector('.inline-edit-unit').value;
                if (isNaN(newQty) || newQty <= 0) { alert("Please enter a valid, positive quantity."); return; }
                const { macrosPer100g, servingGrams } = entry;
                let totalGrams = (newUnit === 'g') ? newQty : (newQty * servingGrams);
                const multiplier = totalGrams / 100;
                entry.fat = (macrosPer100g.f || 0) * multiplier;
                entry.carbs = (macrosPer100g.c || 0) * multiplier;
                entry.protein = (macrosPer100g.p || 0) * multiplier;
                entry.calories = (entry.fat * 9) + (entry.carbs * 4) + (entry.protein * 4);
                entry.originalQty = newQty;
                entry.unit = newUnit;
                entry.name = `${entry.baseName} (${newQty} ${newUnit})`;
                delete entry.isEditing;
                saveDataToFirebase();
                render();
            }
        });
        
        deleteFoodLogBtn.addEventListener('click', async () => {
            if (currentFoodLogDate && await showConfirmation("Are you sure you want to delete this entire day's food log?")) {
                delete getState().foodLogs[currentFoodLogDate];
                currentFoodLogDate = null;
                selectedCalendarDate = getTodayDateString();
                saveDataToFirebase();
                render();
            }
        });

        addFoodItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentFoodLogDate) return;
            const baseName = addFoodItemForm.dataset.baseName;
            if (!baseName) {
                alert("Please select a food from search or create a new custom food.");
                return;
            }
            const fat = parseFloat(foodItemFatInput.value) || 0;
            const carbs = parseFloat(foodItemCarbsInput.value) || 0;
            const protein = parseFloat(foodItemProteinInput.value) || 0;
            const unit = foodItemUnitSelect.value;
            const originalQty = parseFloat(foodItemQuantityInput.value) || 1;
            const newItem = {
                id: Date.now(), name: `${baseName} (${originalQty} ${unit})`, meal: foodItemMealSelect.value,
                fat, carbs, protein, calories: (fat * 9) + (carbs * 4) + (protein * 4), baseName,
                macrosPer100g: JSON.parse(addFoodItemForm.dataset.macrosPer100g),
                servingGrams: parseFloat(addFoodItemForm.dataset.servingGrams), originalQty, unit,
            };
            (getState().foodLogs[currentFoodLogDate].items = getState().foodLogs[currentFoodLogDate].items || []).push(newItem);
            saveDataToFirebase();
            render();
            addFoodItemForm.reset();
            addFoodItemForm.removeAttribute('data-base-name');
            addFoodItemForm.removeAttribute('data-macros-per-100g');
            addFoodItemForm.removeAttribute('data-serving-grams');
            foodMacroDetails.style.display = 'none';
            setSmartMealDefault();
            foodItemNameInput.focus();
        });

        customFoodForm.addEventListener('submit', (e) => {
            e.preventDefault();
            customFoodError.textContent = '';
            const name = customFoodName.value.trim();
            const servingSize = parseFloat(customServingSize.value);
            const fat = parseFloat(customFat.value);
            const carbs = parseFloat(customCarbs.value);
            const protein = parseFloat(customProtein.value);
            if (!name || !servingSize || servingSize <= 0) { customFoodError.textContent = 'Please fill out a valid name and positive serving size.'; return; }
            if (isNaN(fat) || isNaN(carbs) || isNaN(protein)) { customFoodError.textContent = 'Please fill out all macro fields.'; return; }
            const multiplier = 100 / servingSize;
            const newUniqueFood = {
                id: `custom_${Date.now()}`, name,
                macrosPer100g: { p: protein * multiplier, c: carbs * multiplier, f: fat * multiplier },
                servingGrams: servingSize, servingUnitName: `${servingSize}g serving`, isCustom: true
            };
            if (getState().uniqueFoods.some(food => food.name.toLowerCase() === newUniqueFood.name.toLowerCase())) {
                customFoodError.textContent = 'A custom food with this name already exists.'; return;
            }
            getState().uniqueFoods.push(newUniqueFood);
            saveDataToFirebase();
            alert(`Successfully saved "${newUniqueFood.name}"!`);
            closeCustomFoodModal();
        });
        
        showCustomFoodModalBtn.addEventListener('click', openCustomFoodModal);
        customFoodModalCloseBtn.addEventListener('click', closeCustomFoodModal);
        foodItemQuantityInput.addEventListener('input', handleMacroRecalculation);
        foodItemUnitSelect.addEventListener('change', handleMacroRecalculation);
        scanBarcodeBtn.addEventListener('click', startScanner);
        scannerCloseBtn.addEventListener('click', stopScanner);
        foodItemMealSelect.addEventListener('change', () => { lastSelectedMeal = foodItemMealSelect.value; });
        foodCalendarPrevWeekBtn.addEventListener('click', () => { calendarViewDate.setDate(calendarViewDate.getDate() - 7); render(); });
        foodCalendarNextWeekBtn.addEventListener('click', () => { calendarViewDate.setDate(calendarViewDate.getDate() + 7); render(); });
        foodCalendarDaysGrid.addEventListener('click', (e) => { const dayEl = e.target.closest('.calendar-day'); if (dayEl) { selectedCalendarDate = dayEl.dataset.date; render(); } });
        createFoodLogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = selectedCalendarDate;
            if (!getState().foodLogs[date]) {
                getState().foodLogs[date] = { items: [], isFinished: false };
            }
            saveDataToFirebase();
            render();
        });
        prevFoodLogBtn.addEventListener('click', () => { const s = Object.keys(getState().foodLogs).sort((a,b)=>new Date(b)-new Date(a)); const i = s.indexOf(currentFoodLogDate); if (i < s.length - 1) { selectedCalendarDate = s[i+1]; render(); } });
        nextFoodLogBtn.addEventListener('click', () => { const s = Object.keys(getState().foodLogs).sort((a,b)=>new Date(b)-new Date(a)); const i = s.indexOf(currentFoodLogDate); if (i > 0) { selectedCalendarDate = s[i-1]; render(); } });
        finishFoodLogBtn.addEventListener('click', () => { const l = getState().foodLogs[currentFoodLogDate]; if (l) { l.isFinished = true; saveDataToFirebase(); render(); } });
        editFoodLogBtn.addEventListener('click', () => { const l = getState().foodLogs[currentFoodLogDate]; if (l) { l.isFinished = false; saveDataToFirebase(); render(); } });
    }

    // --- 6. INITIALIZATION ---
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        getTodayDateString = api.getTodayDateString;
        foodApi = api.foodApi;
        calculateCurrentGoals = api.calculateCurrentGoals;
        formatDate = api.formatDate;
        showConfirmation = api.showConfirmation;
        
        // Initialize the search module for the main food log's search bar
        searchModule.init(api);
        // Tell the search module what to listen to and what to do when an item is selected
        searchModule.listen(foodItemNameInput, foodSearchResultsContainer, (selectedFood) => {
            populateAndShowMainForm(selectedFood);
        });
        
        selectedCalendarDate = getTodayDateString();
        foodLogDateInput.value = selectedCalendarDate;
        html5QrCode = new Html5Qrcode("barcode-reader");
        bindEvents();
        setSmartMealDefault();
    }
    
    return { init, render };
}