// js/modules/recipes.js

function createRecipesModule() {
    // --- 1. Module State and Variables ---
    let db, getState, saveDataToFirebase;
    let isActive = false;
    let ingredients = [];

    // DOM Elements
    let modal, recipeNameInput, ingredientsListEl;
    let totalWeightEl, totalCaloriesEl, totalMacrosEl;
    let saveBtn, cancelBtn;
    let ingredientSearchInput, ingredientSearchResults;
    
    // Each instance of the recipe module gets its own search module
    const searchModule = createSearchModule();

    // --- 3. Private Functions ---

    function _openModal() {
        // Reset state from any previous creation
        ingredients = [];
        recipeNameInput.value = '';
        _render();
        isActive = true;
        modal.style.display = 'flex';
    }

    function _closeModal() {
        isActive = false;
        modal.style.display = 'none';
        ingredientSearchInput.value = '';
        ingredientSearchResults.innerHTML = '';
        ingredientSearchResults.style.display = 'none';
    }

    function _calculateAndRenderTotals() {
        let totalWeight = 0;
        const totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

        ingredients.forEach(ing => {
            const ingredientWeight = ing.weight;
            const scale = ingredientWeight / 100; // Nutrition facts are per 100g

            totalWeight += ingredientWeight;
            totalNutrition.calories += (ing.nutrition.calories || 0) * scale;
            totalNutrition.protein += (ing.nutrition.protein || 0) * scale;
            totalNutrition.carbs += (ing.nutrition.carbs || 0) * scale;
            totalNutrition.fat += (ing.nutrition.fat || 0) * scale;
        });

        totalWeightEl.textContent = totalWeight.toFixed(1);
        totalCaloriesEl.textContent = Math.round(totalNutrition.calories);
        totalMacrosEl.textContent = `P: ${Math.round(totalNutrition.protein)}g, C: ${Math.round(totalNutrition.carbs)}g, F: ${Math.round(totalNutrition.fat)}g`;
    }

    function _render() {
        if (ingredients.length === 0) {
            ingredientsListEl.innerHTML = '<p>No ingredients added yet.</p>';
        } else {
            ingredientsListEl.innerHTML = ingredients.map((ing, index) => `
                <div class="recipe-ingredient-item" data-index="${index}">
                    <span><strong>${ing.name}</strong> - ${ing.weight}g</span>
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
        if (ingredients.length === 0) {
            alert("Please add at least one ingredient to your recipe.");
            return;
        }

        // Calculate final totals for saving
        let totalWeight = 0;
        const totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        ingredients.forEach(ing => {
            const weight = parseFloat(ing.weight);
            const scale = weight / 100;
            totalWeight += weight;
            totalNutrition.calories += (ing.nutrition.calories || 0) * scale;
            totalNutrition.protein += (ing.nutrition.protein || 0) * scale;
            totalNutrition.carbs += (ing.nutrition.carbs || 0) * scale;
            totalNutrition.fat += (ing.nutrition.fat || 0) * scale;
        });

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
            ingredients: ingredients.map(ing => ({
                foodId: ing.id,
                name: ing.name,
                weight: ing.weight,
                nutrition: ing.nutrition
            }))
        };
        
        const state = getState();
        state.uniqueFoods.push(recipeObject);
        saveDataToFirebase();

        alert(`Recipe "${recipeName}" saved successfully!`);
        _closeModal();
    }
    
    function addIngredient(foodData) {
        const weight = prompt(`Enter weight for ${foodData.name} (in grams):`);
        if (weight === null || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
            return; // User cancelled or entered invalid weight
        }
        ingredients.push({
            id: foodData.id,
            name: foodData.name,
            weight: parseFloat(weight),
            nutrition: foodData.nutrition
        });
        _render();
    }

    // --- 5. Init & Event Binding ---

    function init(api) {
        db = api.db;
        getState = api.getState;
        saveDataToFirebase = api.saveDataToFirebase;

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

        // Initialize our private search module instance
        searchModule.init(api);
        // Tell it to listen to our internal search bar and what to do when an item is selected
        searchModule.listen(ingredientSearchInput, ingredientSearchResults, (selectedFood) => {
            addIngredient(selectedFood);
        });

        document.getElementById('show-recipe-creator-btn').addEventListener('click', _openModal);
        cancelBtn.addEventListener('click', _closeModal);
        saveBtn.addEventListener('click', _saveRecipe);
        
        ingredientsListEl.addEventListener('click', e => {
            if (e.target.classList.contains('remove-ingredient-btn')) {
                const item = e.target.closest('.recipe-ingredient-item');
                const index = parseInt(item.dataset.index, 10);
                ingredients.splice(index, 1);
                _render();
            }
        });
    }

    // The recipes module only needs an `init` function as it's self-contained.
    return {
        init
    };
}