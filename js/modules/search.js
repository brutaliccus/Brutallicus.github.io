// js/modules/search.js

function createSearchModule() {
    // --- 1. MODULE SCOPE & REFERENCES ---
    let getState, foodApi, saveDataToFirebase, showConfirmation;
    let usdaSearchTimeout;

    // --- 2. MAIN "LISTEN" FUNCTION ---
    // This is the core of the module. It takes DOM elements and a callback.
    function listen(inputEl, resultsContainerEl, onItemSelected) {
        
        inputEl.addEventListener('input', () => {
            clearTimeout(usdaSearchTimeout);
            const query = inputEl.value.trim();
            resultsContainerEl.innerHTML = '';
            resultsContainerEl.style.display = 'block';

            if (query.length < 2) {
                resultsContainerEl.style.display = 'none';
                return;
            }

            if (/^\d{8,}$/.test(query)) {
                resultsContainerEl.innerHTML = `<div class="search-result-item upc-result" data-upc="${query}"><strong style="color:var(--primary-color);">Search for UPC: ${query}</strong></div>`;
                return;
            }

            const lowerCaseQuery = query.toLowerCase();
            const filteredLocal = getState().uniqueFoods.filter(food => food.name.toLowerCase().includes(lowerCaseQuery));
            let localResultsHTML = '';

            if (filteredLocal.length > 0) {
                localResultsHTML += '<h6 class="search-results-header">My Foods</h6>';
                filteredLocal.forEach(food => {
                    let foodData;
                    // Prepare data differently for recipes vs normal custom foods
                    if (food.type === 'recipe') {
                        foodData = { id: food.id, baseName: food.name, type: 'recipe', ...food };
                    } else {
                        foodData = { id: food.id || `custom_${food.name.replace(/\s/g, '')}`, baseName: food.name, macrosPer100g: food.macrosPer100g, servingGrams: food.servingGrams, servingUnitName: food.servingUnitName };
                    }
                    const icon = food.type === 'recipe' ? '&#128214; ' : ''; // Recipe book icon
                    localResultsHTML += `
                        <div class="search-result-item" data-food-data='${JSON.stringify(foodData)}'>
                            <span>${icon}${food.name}</span>
                            <button class="icon-btn delete" title="Delete Saved Food" data-food-name-delete="${food.name}">&#128465;</button>
                        </div>`;
                });
            }
            resultsContainerEl.innerHTML = localResultsHTML;

            resultsContainerEl.innerHTML += `<div id="usda-search-loader-${inputEl.id}" class="search-meta-info"><p>Searching USDA database...</p></div>`;
            usdaSearchTimeout = setTimeout(() => {
                foodApi.searchUsda(lowerCaseQuery).then(foods => {
                    const loader = document.getElementById(`usda-search-loader-${inputEl.id}`);
                    if (loader) loader.remove();
                    if (!foods || foods.length === 0) return;

                    let usdaResultsHTML = '<h6 class="search-results-header">USDA Database</h6>';
                    foods.forEach(food => {
                        const p = food.foodNutrients.find(n => n.nutrientId === 1003)?.value || 0;
                        const f = food.foodNutrients.find(n => n.nutrientId === 1004)?.value || 0;
                        const c = food.foodNutrients.find(n => n.nutrientId === 1005)?.value || 0;
                        const foodData = { id: `usda_${food.fdcId}`, baseName: food.description, servingGrams: 100, servingUnitName: '100g', macrosPer100g: { p, c, f } };
                        usdaResultsHTML += `<div class="search-result-item" data-food-data='${JSON.stringify(foodData)}'><strong>${food.description}</strong> <small>(per 100g) - P: ${p}g, C: ${c}g, F: ${f}g</small></div>`;
                    });
                    resultsContainerEl.innerHTML += usdaResultsHTML;
                }).catch(error => {
                    const loader = document.getElementById(`usda-search-loader-${inputEl.id}`);
                    if (loader) loader.remove();
                    resultsContainerEl.innerHTML += `<p class="search-meta-info" style="color: var(--danger-color);">${error.message}</p>`;
                });
            }, 300);
        });

        resultsContainerEl.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.icon-btn.delete');
            if (deleteBtn) {
                e.stopPropagation();
                const foodNameToDelete = deleteBtn.dataset.foodNameDelete;
                if (await showConfirmation(`Permanently delete "${foodNameToDelete}" from your saved foods?`)) {
                    getState().uniqueFoods = getState().uniqueFoods.filter(food => food.name !== foodNameToDelete);
                    saveDataToFirebase();
                    inputEl.dispatchEvent(new Event('input')); // Trigger a re-search to update the list
                }
                return;
            }

            const resultItem = e.target.closest('.search-result-item');
            if (!resultItem) return;

            let foodDataForProcessing;
            if (resultItem.classList.contains('upc-result')) {
                try {
                    const response = await foodApi.searchByUpc(resultItem.dataset.upc);
                    const product = response.product || response;
                    if (!product || product.status === 0 || !product.product_name) throw new Error('Product not found via UPC.');
                    const nutrients = product.nutriments;
                    foodDataForProcessing = { id: `upc_${resultItem.dataset.upc}`, name: product.product_name, nutrition: { calories: nutrients.energy_kcal_100g || 0, protein: nutrients.proteins_100g || 0, carbs: nutrients.carbohydrates_100g || 0, fat: nutrients.fat_100g || 0 } };
                } catch (error) {
                    resultsContainerEl.innerHTML += `<p class="search-meta-info" style="color: var(--danger-color);">${error.message}</p>`;
                    return;
                }
            } else if (resultItem.dataset.foodData) {
                const parsedData = JSON.parse(resultItem.dataset.foodData);
                foodDataForProcessing = {
                    id: parsedData.id || `custom_${Date.now()}`,
                    name: parsedData.baseName,
                    nutrition: {
                        calories: parsedData.macrosPer100g ? ((parsedData.macrosPer100g.p * 4) + (parsedData.macrosPer100g.c * 4) + (parsedData.macrosPer100g.f * 9)) : (parsedData.totalNutrition?.calories / parsedData.totalWeight * 100 || 0),
                        protein: parsedData.macrosPer100g?.p || (parsedData.totalNutrition?.protein / parsedData.totalWeight * 100 || 0),
                        carbs: parsedData.macrosPer100g?.c || (parsedData.totalNutrition?.carbs / parsedData.totalWeight * 100 || 0),
                        fat: parsedData.macrosPer100g?.f || (parsedData.totalNutrition?.fat / parsedData.totalWeight * 100 || 0)
                    },
                    macrosPer100g: parsedData.macrosPer100g,
                    servingGrams: parsedData.servingGrams,
                    servingUnitName: parsedData.servingUnitName,
                };
            }
            
            // Execute the callback function with the processed food data
            onItemSelected(foodDataForProcessing); 
            
            // Clean up the UI
            inputEl.value = '';
            resultsContainerEl.innerHTML = '';
            resultsContainerEl.style.display = 'none';
        });

        // Hide search results when clicking away from the input or the results list
        document.addEventListener('click', (e) => {
            if (!resultsContainerEl.contains(e.target) && e.target !== inputEl) {
                resultsContainerEl.style.display = 'none';
            }
        });
    }

    // --- 3. INITIALIZATION ---
    function init(api) {
        getState = api.getState;
        foodApi = api.foodApi;
        saveDataToFirebase = api.saveDataToFirebase;
        showConfirmation = api.showConfirmation;
    }

    return {
        init,
        listen
    };
}