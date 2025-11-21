// js/modules/recipes.js (Refactored to use global scannerModule)

function createRecipesModule() {
    // --- 1. Module State and Variables ---
    let db, getState, saveDataToFirebase, scannerModule; // Added scannerModule
    let ingredients = [];
    
    // DOM Elements
    let modal, recipeNameInput, ingredientsListEl, recipeScanBtn; // Added recipeScanBtn
    let totalWeightEl, totalCaloriesEl, totalMacrosEl;
    let saveBtn, cancelBtn;
    let ingredientSearchInput, ingredientSearchResults;

    const searchModule = createSearchModule();
    
    // --- 2. Private Functions ---
    function _openModal() {
        ingredients = [];
        if(recipeNameInput) recipeNameInput.value = '';
        _render();
        modal.style.display = 'flex';
    }

    function _closeModal() {
        modal.style.display = 'none';
        if(ingredientSearchInput) ingredientSearchInput.value = '';
        if(ingredientSearchResults) {
            ingredientSearchResults.innerHTML = '';
            ingredientSearchResults.style.display = 'none';
        }
    }

    function _calculateAndRenderTotals() {
        let totalWeight = 0;
        const totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        
        ingredients.forEach(ing => {
            const ingredientWeight = parseFloat(ing.weight) || 0;
            
            if (ingredientWeight > 0 && ing.nutrition) {
                const scale = ingredientWeight / 100;
                totalWeight += ingredientWeight;
                totalNutrition.calories += (ing.nutrition.calories || 0) * scale;
                totalNutrition.protein += (ing.nutrition.protein || 0) * scale;
                totalNutrition.carbs += (ing.nutrition.carbs || 0) * scale;
                totalNutrition.fat += (ing.nutrition.fat || 0) * scale;
            }
        });
        
        totalWeightEl.textContent = totalWeight.toFixed(1);
        totalCaloriesEl.textContent = Math.round(totalNutrition.calories);
        totalMacrosEl.textContent = `P: ${Math.round(totalNutrition.protein)}g, C: ${Math.round(totalNutrition.carbs)}g, F: ${Math.round(totalNutrition.fat)}g`;
    }

    function _render() {
        if (!ingredientsListEl) return;
        if (ingredients.length === 0) {
            ingredientsListEl.innerHTML = '<p>No ingredients added yet.</p>';
        } else {
            ingredientsListEl.innerHTML = ingredients.map((ing, index) => `
                <div class="recipe-ingredient-item" data-index="${index}">
                    <span class="ingredient-number">${index + 1}.</span>
                    <span class="ingredient-name">${ing.name}</span>
                    <div class="ingredient-weight-input">
                        <input type="number" class="inline-ingredient-weight" value="${ing.weight}" step="1" placeholder="0">
                        <span>g</span>
                    </div>
                    <button class="icon-btn delete remove-ingredient-btn" title="Remove Ingredient">&#10006;</button>
                </div>
            `).join('');
        }
        _calculateAndRenderTotals();
    }

    async function _saveRecipe() {
        const recipeName = recipeNameInput.value.trim();
        if (!recipeName) {
            alert("Please enter a name for your recipe.");
            return;
        }
        if (ingredients.length === 0 || ingredients.every(ing => (parseFloat(ing.weight) || 0) === 0)) {
            alert("Please add at least one ingredient with a weight greater than zero.");
            return;
        }
        
        let totalWeight = 0;
        const totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const finalIngredients = [];

        ingredients.forEach(ing => {
            const weight = parseFloat(ing.weight) || 0;
            if (weight > 0) {
                const scale = weight / 100;
                totalWeight += weight;
                totalNutrition.calories += (ing.nutrition.calories || 0) * scale;
                totalNutrition.protein += (ing.nutrition.protein || 0) * scale;
                totalNutrition.carbs += (ing.nutrition.carbs || 0) * scale;
                totalNutrition.fat += (ing.nutrition.fat || 0) * scale;
                finalIngredients.push({ foodId: ing.id, name: ing.name, weight: weight });
            }
        });

        if (totalWeight === 0) {
            alert("Total recipe weight is zero. Please add weights to your ingredients.");
            return;
        }

        const recipeObject = {
            id: 'recipe_' + Date.now(),
            name: recipeName,
            type: 'recipe',
            totalWeight: totalWeight,
            totalNutrition: {
                calories: Math.round(totalNutrition.calories),
                protein: Math.round(totalNutrition.protein),
                carbs: Math.round(totalNutrition.carbs),
                fat: Math.round(totalNutrition.fat)
            },
            ingredients: finalIngredients
        };

        const state = getState();
        (state.uniqueFoods = state.uniqueFoods || []).push(recipeObject);
        saveDataToFirebase();
        alert(`Recipe "${recipeName}" saved successfully!`);
        _closeModal();
    }
    
    function addIngredient(foodData) {
        const name = foodData.baseName;
        const macros = foodData.macrosPer100g;

        if (!name || !macros) {
            console.error("Could not add ingredient, invalid data received:", foodData);
            alert("There was an error processing the selected ingredient.");
            return;
        }

        ingredients.push({
            id: foodData.id,
            name: name,
            weight: 100,
            nutrition: {
                calories: (macros.p * 4) + (macros.c * 4) + (macros.f * 9),
                protein: macros.p,
                carbs: macros.c,
                fat: macros.f
            }
        });
        
        _render();
    }
    
    // --- 3. Init & Event Binding ---
    function init(api) {
        // Get utilities from the main app
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;
        scannerModule = api.scannerModule; // Get the global scanner module

        // Get all DOM elements
        modal = document.getElementById('recipe-creator-modal');
        recipeNameInput = document.getElementById('recipe-name');
        ingredientsListEl = document.getElementById('recipe-ingredients-list');
        saveBtn = document.getElementById('recipe-creator-save-btn');
        cancelBtn = document.getElementById('recipe-creator-cancel-btn');
        totalWeightEl = document.getElementById('recipe-total-weight');
        totalCaloriesEl = document.getElementById('recipe-total-calories');
        totalMacrosEl = document.getElementById('recipe-total-macros');
        ingredientSearchInput = document.getElementById('ingredient-search-input');
        ingredientSearchResults = document.getElementById('ingredient-search-results');
        recipeScanBtn = document.getElementById('recipe-scan-barcode-btn'); // Get the new button
        
        // Initialize our private search module instance
        searchModule.init(api);
        
        // Tell it to listen to our internal search bar and what to do when an item is selected
        searchModule.listen(ingredientSearchInput, ingredientSearchResults, (selectedFood) => {
            addIngredient(selectedFood);
        });

        // Bind all events
        document.getElementById('show-recipe-creator-btn').addEventListener('click', _openModal);
        cancelBtn.addEventListener('click', _closeModal);
        saveBtn.addEventListener('click', _saveRecipe);

        // --- THIS IS THE NEW PART ---
        if(recipeScanBtn) {
            recipeScanBtn.addEventListener('click', () => {
                // Call the global scanner, passing the ingredient input as the target
                scannerModule.start(ingredientSearchInput);
            });
        }

        // This handles clicks for the 'delete' button using event delegation
        ingredientsListEl.addEventListener('click', e => {
            if (e.target.classList.contains('remove-ingredient-btn')) {
                const item = e.target.closest('.recipe-ingredient-item');
                if (item) {
                    const index = parseInt(item.dataset.index, 10);
                    if (!isNaN(index) && ingredients[index]) {
                        ingredients.splice(index, 1);
                        _render();
                    }
                }
            }
        });

        // This handles typing in the weight input fields to update totals in real-time
        ingredientsListEl.addEventListener('input', e => {
            if (e.target.classList.contains('inline-ingredient-weight')) {
                const item = e.target.closest('.recipe-ingredient-item');
                if (item) {
                    const index = parseInt(item.dataset.index, 10);
                    const newWeight = parseFloat(e.target.value) || 0;
                    if (ingredients[index]) {
                        ingredients[index].weight = newWeight;
                        _calculateAndRenderTotals();
                    }
                }
            }
        });
    }

    return {
        init
    };
}