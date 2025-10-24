// js/modules/food.js (Final Corrected Version)
function createFoodModule() {
    // --- MODULE STATE ---
    let db, getState, saveDataToFirebase, getTodayDateString, foodApi, calculateCurrentGoals, formatDate;
    let currentFoodLogDate = null;
    let calendarViewDate = new Date();
    let selectedCalendarDate = null;
    let macroChart;
    let html5QrCode;
    let lastSelectedMeal = null;
    let usdaSearchTimeout;

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
    const showCustomFoodModalBtn = document.getElementById('show-custom-food-modal-btn');
    const customFoodModal = document.getElementById('custom-food-modal');
    const customFoodModalCloseBtn = document.getElementById('custom-food-modal-close-btn');
    const customFoodForm = document.getElementById('custom-food-form');
    const customFoodName = document.getElementById('custom-food-name');
    const customServingSize = document.getElementById('custom-serving-size');
    const customFat = document.getElementById('custom-fat');
    const customCarbs = document.getElementById('custom-carbs');
    const customProtein = document.getElementById('custom-protein');
    const customFoodError = document.getElementById('custom-food-error');

    // --- HELPER FUNCTIONS ---
    function toLocalISOString(date) { const year = date.getFullYear(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; }
    const getMacroColorClass = (current, goal) => { if (goal <= 0) return 'macro-default'; const percentage = (current / goal) * 100; if (percentage > 125) return 'macro-red'; if (percentage >= 75) return 'macro-green'; if (percentage >= 50) return 'macro-yellow'; return 'macro-red'; };
    function getMealForCurrentTime() { const now = new Date(); const hours = now.getHours(); const minutes = now.getMinutes(); const currentTime = hours + (minutes / 60); if (currentTime < 10.5) { return 'Breakfast'; } else if (currentTime < 15.5) { return 'Lunch'; } else if (currentTime < 17.5) { return 'Snack'; } else { return 'Dinner'; } }
    function setSmartMealDefault() { if (lastSelectedMeal) { foodItemMealSelect.value = lastSelectedMeal; } else { foodItemMealSelect.value = getMealForCurrentTime(); } }
    function openCustomFoodModal() { customFoodModal.style.display = 'flex'; }
    function closeCustomFoodModal() { customFoodModal.style.display = 'none'; customFoodForm.reset(); customFoodError.textContent = ''; }
    
    // --- RENDER FUNCTIONS ---
    function renderFoodCalendar() { const today = new Date(); today.setHours(0, 0, 0, 0); const foodLogs = getState().foodLogs; const { goals: currentGoals } = calculateCurrentGoals(); calendarViewDate.setHours(0, 0, 0, 0); const startOfWeek = new Date(calendarViewDate); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); foodCalendarMonthYear.textContent = calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' }); foodCalendarDaysGrid.innerHTML = ''; for (let i = 0; i < 7; i++) { const day = new Date(startOfWeek); day.setDate(day.getDate() + i); const dateString = toLocalISOString(day); const log = foodLogs[dateString]; const isToday = day.getTime() === today.getTime(); const isSelected = dateString === selectedCalendarDate; const isOtherMonth = day.getMonth() !== calendarViewDate.getMonth(); const dayEl = document.createElement('div'); dayEl.className = 'calendar-day'; dayEl.dataset.date = dateString; if (isToday) dayEl.classList.add('is-today'); if (isSelected) dayEl.classList.add('is-selected'); if (isOtherMonth) dayEl.classList.add('other-month'); const dayNumber = document.createElement('span'); dayNumber.className = 'day-number'; dayNumber.textContent = day.getDate(); dayEl.appendChild(dayNumber); if (log && log.items && log.items.length > 0) { const totals = log.items.reduce((acc, item) => { acc.calories += Number(item.calories) || 0; acc.protein += Number(item.protein) || 0; return acc; }, { calories: 0, protein: 0 }); const colorClass = getMacroColorClass(totals.calories, currentGoals.calories); const bar = document.createElement('button'); bar.className = 'food-calendar-bar'; bar.classList.add(colorClass); bar.textContent = `${totals.calories.toFixed(0)} cals | ${totals.protein.toFixed(0)}g P`; dayEl.appendChild(bar); } foodCalendarDaysGrid.appendChild(dayEl); } }
    function render() { if (!selectedCalendarDate) { selectedCalendarDate = getTodayDateString(); } renderFoodCalendar(); const sortedDates = Object.keys(getState().foodLogs).sort((a, b) => new Date(b) - new Date(a)); if (!currentFoodLogDate || !getState().foodLogs[currentFoodLogDate]) { currentFoodLogDate = getState().foodLogs[selectedCalendarDate] ? selectedCalendarDate : null; } selectedCalendarDate = currentFoodLogDate || selectedCalendarDate; if (currentFoodLogDate && getState().foodLogs[currentFoodLogDate]) { currentFoodLogSection.style.display = 'block'; const log = getState().foodLogs[currentFoodLogDate]; const isFinished = log.isFinished || false; foodLogTitle.textContent = formatDate(currentFoodLogDate); const currentIndex = sortedDates.indexOf(currentFoodLogDate); prevFoodLogBtn.disabled = currentIndex >= sortedDates.length - 1; nextFoodLogBtn.disabled = currentIndex <= 0; addFoodItemForm.style.display = isFinished ? 'none' : 'block'; finishFoodLogBtn.style.display = isFinished ? 'none' : 'block'; editFoodLogBtn.style.display = isFinished ? 'inline-block' : 'none'; renderFoodEntries(log.items, isFinished); calculateAndRenderTotals(log.items); } else { currentFoodLogSection.style.display = 'none'; } }
    
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
                const mealItemsContainer = document.createElement('div');
                mealItemsContainer.className = 'food-entries-list';
                groupedByMeal[meal].forEach(item => {
                    const isEditMode = item.isEditing === true;
                    const details = document.createElement('details');
                    details.className = 'food-item-details';
                    details.dataset.entryId = item.id;
                    if (isEditMode) {
                        details.open = true;
                    }
                    const summary = document.createElement('summary');
                    summary.className = 'food-item-summary';
                    summary.innerHTML = ` <span class="food-name">${item.name}</span> <span class="food-calories">${Number(item.calories || 0).toFixed(0)} kcal</span> `;
                    const content = document.createElement('div');
                    content.className = 'food-item-content';
                    let contentHTML = '';
                    if (isEditMode) {
                        const originalQty = parseFloat(item.originalQty) || 1;
                        const servingGrams = parseFloat(item.servingGrams) || 1;
                        let unitOptions = `<option value="serving" ${item.unit === 'serving' ? 'selected' : ''}>serving</option>`;
                        if (servingGrams > 1) {
                            unitOptions += `<option value="g" ${item.unit === 'g' ? 'selected' : ''}>g</option>`;
                        }
                        contentHTML = ` <div class="macro-grid"> <span>Fat: ${Number(item.fat || 0).toFixed(1)}g</span> <span>Carbs: ${Number(item.carbs || 0).toFixed(1)}g</span> <span>Protein: ${Number(item.protein || 0).toFixed(1)}g</span> </div> <div class="edit-quantity-form"> <input type="number" class="inline-edit-qty" value="${originalQty}" step="0.1" required> <select class="inline-edit-unit">${unitOptions}</select> <button class="icon-btn save" title="Save Quantity">&#10004;</button> <button class="icon-btn cancel" title="Cancel Edit">&#10006;</button> </div> `;
                    } else {
                        contentHTML = ` <div class="macro-grid"> <span>Fat: ${Number(item.fat || 0).toFixed(1)}g</span> <span>Carbs: ${Number(item.carbs || 0).toFixed(1)}g</span> <span>Protein: ${Number(item.protein || 0).toFixed(1)}g</span> </div> <div class="food-item-actions"> ${!isFinished ? `<button class="icon-btn edit" title="Edit Quantity">&#9998;</button>` : ''} ${!isFinished ? `<button class="icon-btn delete" title="Delete Entry">&#128465;</button>` : ''} </div> `;
                    }
                    content.innerHTML = contentHTML;
                    details.appendChild(summary);
                    details.appendChild(content);
                    mealItemsContainer.appendChild(details);
                });
                foodLogEntries.innerHTML += mealHTML;
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
        calorieGoalProgress.innerHTML = goalCals > 0 ? `<span class="${getMacroColorClass(totals.calories, goalCals)}">${totals.calories.toFixed(0)}</span> / ${goalCals.toFixed(0)} kcal` : '';
        const goalFat = currentGoals.fat || 0;
        const goalCarbs = currentGoals.carbs || 0;
        const goalProtein = currentGoals.protein || 0;
        foodLogTotals.innerHTML = ` <span class="macro-value">Fat: <span class="${getMacroColorClass(totals.fat, goalFat)}">${totals.fat.toFixed(1)}</span>/${goalFat.toFixed(0)}g</span> | <span class="macro-value">Carbs: <span class="${getMacroColorClass(totals.carbs, goalCarbs)}">${totals.carbs.toFixed(1)}</span>/${goalCarbs.toFixed(0)}g</span> | <span class="macro-value">Protein: <span class="${getMacroColorClass(totals.protein, goalProtein)}">${totals.protein.toFixed(1)}</span>/${goalProtein.toFixed(0)}g</span>`;
        renderPieChart(totals);
    }

    function renderPieChart(totals) { const canvas = document.getElementById('macro-pie-chart'); if (!canvas) return; const ctx = canvas.getContext('2d'); if (macroChart) { macroChart.destroy(); } const totalCalories = totals.calories; if (totalCalories === 0) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; } const fatCals = totals.fat * 9; const carbCals = totals.carbs * 4; const protCals = totals.protein * 4; macroChart = new Chart(ctx, { type: 'pie', data: { labels: [`Fat (${(fatCals / totalCalories * 100).toFixed(0)}%)`, `Carbs (${(carbCals / totalCalories * 100).toFixed(0)}%)`, `Protein (${(protCals / totalCalories * 100).toFixed(0)}%)`], datasets: [{ data: [fatCals, carbCals, protCals], backgroundColor: ['#FFC107', '#03A9F4', '#F44336'], borderColor: getComputedStyle(document.body).getPropertyValue('--card-background'), borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } } } } }); }
    function populateUniqueFoods() { /* TODO: Refactor for new data model */ }
    function handleUpcSuccess(product) { const nutrients = product.nutriments; const productName = product.product_name || 'Unknown Product'; const servingSizeString = product.serving_size || '100g'; const servingGrams = parseFloat(product.serving_quantity) || parseFloat(servingSizeString) || 100; const macrosPer100g = { p: nutrients.proteins_100g ?? 0, c: nutrients.carbohydrates_100g ?? 0, f: nutrients.fat_100g ?? 0 }; const foodData = { baseName: productName, servingGrams: servingGrams, servingUnitName: servingSizeString, macrosPer100g: macrosPer100g }; populateAndShowMainForm(foodData); }
    function handleUsdaSuccess(foods) { document.getElementById('usda-search-loader')?.remove(); if (foodMacroDetails.style.display !== 'none') return; if (!foods || foods.length === 0) { if (!foodSearchResultsContainer.querySelector('.search-results-header')) { foodSearchResultsContainer.innerHTML += '<p class="search-meta-info">No USDA results found.</p>'; } return; } let usdaResultsHTML = '<h6 class="search-results-header">USDA Database</h6>'; foods.forEach(food => { const protein = food.foodNutrients.find(n => n.nutrientId === 1003)?.value || 0; const fat = food.foodNutrients.find(n => n.nutrientId === 1004)?.value || 0; const carbs = food.foodNutrients.find(n => n.nutrientId === 1005)?.value || 0; const foodData = { baseName: food.description, servingGrams: 100, servingUnitName: `100g`, macrosPer100g: { p: protein, c: carbs, f: fat } }; usdaResultsHTML += `<div class="search-result-item" data-food-data='${JSON.stringify(foodData)}'> <strong>${food.description}</strong> <small>(per 100g) - P: ${protein}g, C: ${carbs}g, F: ${fat}g</small> </div>`; }); foodSearchResultsContainer.innerHTML += usdaResultsHTML; }
    function handleApiError(error) { document.getElementById('usda-search-loader')?.remove(); const message = `API Search Error: ${error.message}.`; if (foodMacroDetails.style.display === 'none') { foodSearchResultsContainer.innerHTML += `<p style="color: var(--danger-color);">${message}</p>`; } else { alert(message); } console.error(message, error); }
    const onScanSuccess = (decodedText) => { stopScanner(); foodSearchResultsContainer.innerHTML = '<p class="search-meta-info">Searching for UPC...</p>'; foodApi.searchByUpc(decodedText).then(handleUpcSuccess).catch(handleApiError); };
    const onScanError = () => {};
    const startScanner = () => { scannerModal.style.display = 'flex'; html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, onScanSuccess, onScanError).catch(err => { alert("Error: Could not start camera. Please grant permissions."); stopScanner(); }); };
    const stopScanner = () => { if (html5QrCode && html5QrCode.isScanning) { html5QrCode.stop().catch(err => console.error("Failed to stop scanner.", err)); } scannerModal.style.display = 'none'; };
    const handleMacroRecalculation = () => { const data = addFoodItemForm.dataset; if (!data.macrosPer100g) return; const macrosPer100g = JSON.parse(data.macrosPer100g); const servingGrams = parseFloat(data.servingGrams); const quantity = parseFloat(foodItemQuantityInput.value) || 0; const unit = foodItemUnitSelect.value; let totalGrams = 0; if (unit === 'g') { totalGrams = quantity; } else { totalGrams = quantity * servingGrams; } const multiplier = totalGrams / 100; const finalFat = (macrosPer100g.f || 0) * multiplier; const finalCarbs = (macrosPer100g.c || 0) * multiplier; const finalProtein = (macrosPer100g.p || 0) * multiplier; foodItemFatInput.value = finalFat.toFixed(1); foodItemCarbsInput.value = finalCarbs.toFixed(1); foodItemProteinInput.value = finalProtein.toFixed(1); };
    function populateAndShowMainForm(foodData) { addFoodItemForm.dataset.baseName = foodData.baseName; addFoodItemForm.dataset.macrosPer100g = JSON.stringify(foodData.macrosPer100g); addFoodItemForm.dataset.servingGrams = foodData.servingGrams; foodItemNameInput.value = foodData.baseName; foodSearchResultsContainer.innerHTML = ''; addFoodItemForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); foodItemUnitSelect.innerHTML = ` <option value="serving">${foodData.servingUnitName || 'serving'}</option> <option value="g">g</option> `; foodItemQuantityInput.value = 1; foodItemUnitSelect.value = 'serving'; foodMacroDetails.style.display = 'flex'; handleMacroRecalculation(); }
    function loadFoodLogByDate(dateString) { if (getState().foodLogs[dateString]) { currentFoodLogDate = dateString; render(); currentFoodLogSection.scrollIntoView({ behavior: 'smooth' }); } }

    // --- EVENT BINDING ---
    function bindEvents() {
        // Modal Listeners
        showCustomFoodModalBtn.addEventListener('click', openCustomFoodModal);
        customFoodModalCloseBtn.addEventListener('click', closeCustomFoodModal);
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
            const newUniqueFood = { name: name, macrosPer100g: { p: protein * multiplier, c: carbs * multiplier, f: fat * multiplier }, servingGrams: servingSize, servingUnitName: `${servingSize}g serving`, isCustom: true };
            const uniqueFoods = getState().uniqueFoods;
            if (uniqueFoods.some(food => food.name.toLowerCase() === newUniqueFood.name.toLowerCase())) { customFoodError.textContent = 'A custom food with this name already exists.'; return; }
            uniqueFoods.push(newUniqueFood);
            saveDataToFirebase();
            alert(`Successfully saved "${newUniqueFood.name}"!`);
            closeCustomFoodModal();
        });

        // Search and Main Form Listeners
        foodItemNameInput.addEventListener('input', () => {
            clearTimeout(usdaSearchTimeout);
            const query = foodItemNameInput.value.trim();
            foodSearchResultsContainer.innerHTML = '';
            foodMacroDetails.style.display = 'none';
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
                filteredLocal.forEach(food => {
                    const foodData = { baseName: food.name, macrosPer100g: food.macrosPer100g, servingGrams: food.servingGrams, servingUnitName: food.servingUnitName };
                    localResultsHTML += `<div class="search-result-item" data-food-data='${JSON.stringify(foodData)}'>
                        <span>${food.name}</span>
                        <button class="icon-btn delete" title="Delete Saved Food" data-food-name-delete="${food.name}">&#128465;</button>
                    </div>`;
                });
            }
            foodSearchResultsContainer.innerHTML = localResultsHTML;
            foodSearchResultsContainer.innerHTML += `<div id="usda-search-loader" class="search-meta-info"><p>Searching USDA database...</p></div>`;
            usdaSearchTimeout = setTimeout(() => {
                foodApi.searchUsda(lowerCaseQuery)
                    .then(handleUsdaSuccess)
                    .catch(handleApiError);
            }, 300);
        });

        foodSearchResultsContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.icon-btn.delete');
            if (deleteBtn) {
                e.stopPropagation();
                const foodNameToDelete = deleteBtn.dataset.foodNameDelete;
                if (confirm(`Are you sure you want to permanently delete "${foodNameToDelete}"?`)) {
                    getState().uniqueFoods = getState().uniqueFoods.filter(food => food.name !== foodNameToDelete);
                    saveDataToFirebase();
                    foodItemNameInput.dispatchEvent(new Event('input'));
                }
                return;
            }
            const resultItem = e.target.closest('.search-result-item');
            if (!resultItem) return;
            if (resultItem.classList.contains('upc-result')) {
                foodApi.searchByUpc(resultItem.dataset.upc).then(handleUpcSuccess).catch(handleApiError);
                return;
            }
            if (resultItem.dataset.foodData) {
                const foodData = JSON.parse(resultItem.dataset.foodData);
                populateAndShowMainForm(foodData);
            }
        });
        
        addFoodItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentFoodLogDate) return;
            const baseName = addFoodItemForm.dataset.baseName;
            if (!baseName) { alert("Please select a food from the search results or create a new custom food."); return; }
            const fat = parseFloat(foodItemFatInput.value) || 0;
            const carbs = parseFloat(foodItemCarbsInput.value) || 0;
            const protein = parseFloat(foodItemProteinInput.value) || 0;
            const unit = foodItemUnitSelect.value;
            const originalQty = parseFloat(foodItemQuantityInput.value) || 1;
            const finalName = `${baseName} (${originalQty} ${unit})`;
            const newItem = {
                id: Date.now(),
                name: finalName,
                meal: foodItemMealSelect.value,
                fat,
                carbs,
                protein,
                calories: (fat * 9) + (carbs * 4) + (protein * 4),
                baseName: baseName,
                macrosPer100g: JSON.parse(addFoodItemForm.dataset.macrosPer100g),
                servingGrams: parseFloat(addFoodItemForm.dataset.servingGrams),
                originalQty: originalQty,
                unit: unit,
            };
            (getState().foodLogs[currentFoodLogDate].items = getState().foodLogs[currentFoodLogDate].items || []).push(newItem);
            saveDataToFirebase();
            render();
            addFoodItemForm.reset();
            foodMacroDetails.style.display = 'none';
            setSmartMealDefault();
            foodItemNameInput.focus();
        });

        foodLogEntries.addEventListener('click', (e) => {
            if (e.target.matches('.icon-btn')) { e.preventDefault(); }
            const entryDetails = e.target.closest('.food-item-details');
            if (!entryDetails || !currentFoodLogDate) return;
            const entryId = Number(entryDetails.dataset.entryId);
            const log = getState().foodLogs[currentFoodLogDate];
            if (!log) return;
            const entry = log.items.find(item => item.id === entryId);
            if (!entry) return;
            if (e.target.matches('.icon-btn.delete')) { if (confirm('Delete this food entry?')) { const entryIndex = log.items.findIndex(item => item.id === entryId); if (entryIndex > -1) { log.items.splice(entryIndex, 1); saveDataToFirebase(); render(); } } }
            else if (e.target.matches('.icon-btn.edit')) { entry.isEditing = true; render(); setTimeout(() => { const newRow = foodLogEntries.querySelector(`[data-entry-id="${entryId}"]`); if (newRow) { newRow.querySelector('.inline-edit-qty').focus(); newRow.querySelector('.inline-edit-qty').select(); } }, 0); } 
            else if (e.target.matches('.icon-btn.cancel')) { delete entry.isEditing; render(); } 
            else if (e.target.matches('.icon-btn.save')) {
                const newQty = parseFloat(entryDetails.querySelector('.inline-edit-qty').value);
                const newUnit = entryDetails.querySelector('.inline-edit-unit').value;
                if (isNaN(newQty) || newQty <= 0) { alert("Please enter a valid, positive quantity."); return; }
                const macrosPer100g = entry.macrosPer100g;
                const servingGrams = entry.servingGrams;
                let totalGrams = 0;
                if (newUnit === 'g') { totalGrams = newQty; } else { totalGrams = newQty * servingGrams; }
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

        // Restored Listeners
        foodItemQuantityInput.addEventListener('input', handleMacroRecalculation);
        foodItemUnitSelect.addEventListener('change', handleMacroRecalculation);
        scanBarcodeBtn.addEventListener('click', startScanner);
        scannerCloseBtn.addEventListener('click', stopScanner);
        foodItemMealSelect.addEventListener('change', () => { lastSelectedMeal = foodItemMealSelect.value; });
        foodCalendarPrevWeekBtn.addEventListener('click', () => { const newDate = new Date(calendarViewDate); newDate.setDate(newDate.getDate() - 7); calendarViewDate = newDate; renderFoodCalendar(); });
        foodCalendarNextWeekBtn.addEventListener('click', () => { const newDate = new Date(calendarViewDate); newDate.setDate(newDate.getDate() + 7); calendarViewDate = newDate; renderFoodCalendar(); });
        foodCalendarDaysGrid.addEventListener('click', (e) => { const dayEl = e.target.closest('.calendar-day'); if (!dayEl) return; const dateString = dayEl.dataset.date; selectedCalendarDate = dateString; foodLogDateInput.value = dateString; if (e.target.matches('.food-calendar-bar')) { loadFoodLogByDate(dateString); } else { renderFoodCalendar(); } });
        createFoodLogForm.addEventListener('submit', (e) => { e.preventDefault(); const date = selectedCalendarDate; if (!getState().foodLogs[date]) { getState().foodLogs[date] = { items: [], isFinished: false }; } currentFoodLogDate = date; saveDataToFirebase(); render(); });
        prevFoodLogBtn.addEventListener('click', () => { const s = Object.keys(getState().foodLogs).sort((a, b) => new Date(b) - new Date(a)); const c = s.indexOf(currentFoodLogDate); if (c < s.length - 1) { currentFoodLogDate = s[c + 1]; render(); } });
        nextFoodLogBtn.addEventListener('click', () => { const s = Object.keys(getState().foodLogs).sort((a, b) => new Date(b) - new Date(a)); const c = s.indexOf(currentFoodLogDate); if (c > 0) { currentFoodLogDate = s[c - 1]; render(); } });
        deleteFoodLogBtn.addEventListener('click', () => { if (currentFoodLogDate && confirm("Delete this day's food log?")) { delete getState().foodLogs[currentFoodLogDate]; currentFoodLogDate = null; selectedCalendarDate = getTodayDateString(); saveDataToFirebase(); render(); } });
        finishFoodLogBtn.addEventListener('click', () => { const l = getState().foodLogs[currentFoodLogDate]; if (l) { l.isFinished = true; saveDataToFirebase(); render(); } });
        editFoodLogBtn.addEventListener('click', () => { const l = getState().foodLogs[currentFoodLogDate]; if (l) { l.isFinished = false; saveDataToFirebase(); render(); } });
    }
    
    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        getTodayDateString = api.getTodayDateString;
        foodApi = api.foodApi;
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
