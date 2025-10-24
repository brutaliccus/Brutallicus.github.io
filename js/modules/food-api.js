// js/modules/food-api.js
function createFoodApiModule({ USDA_API_KEY }) {

    async function searchByUpc(upc) {
        const url = `https://world.openfoodfacts.org/api/v2/product/${upc}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.status_verbose || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.status === 0) throw new Error(data.status_verbose);
            
            return data.product;

        } catch (error) {
            console.error("UPC Fetch Error:", error);
            throw error;
        }
    }

    async function searchUsda(query) {
        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=5`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            return data.foods || [];

        } catch (error) {
            console.error("USDA API Fetch Error:", error);
            throw error;
        }
    }

    return {
        searchByUpc,
        searchUsda
    };
}