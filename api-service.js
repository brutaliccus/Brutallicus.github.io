// api-service.js

const ApiService = (() => {
    // Initialize Firebase using the global `firebaseConfig` from config.js
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // --- Firebase Functions ---

    const saveDataForUser = (userId, data) => {
        if (!userId) return Promise.reject("No user ID provided for saving data.");
        return db.ref('users/' + userId + '/data').set(data);
    };

    const savePreferencesForUser = (userId, prefs) => {
        if (!userId) return Promise.reject("No user ID provided for saving preferences.");
        return db.ref('users/' + userId + '/preferences').set(prefs);
    };
    
    const loadUser = (userId) => {
        if (!userId) return Promise.reject("No user ID provided for loading.");
        return db.ref('users/' + userId).once('value');
    };

    const registerUser = (userId, name, pin) => {
        const userRef = db.ref('users/' + userId);
        return userRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                throw new Error("This name is already taken. Please choose another.");
            } else {
                return userRef.set({ name, pin });
            }
        });
    };

    // --- USDA API Function ---
    const searchUsdaApi = async (query) => {
        // Uses the global USDA_API_KEY from config.js
        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=10`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`USDA API Error: ${response.statusText}`);
        }
        return response.json();
    };

    // Expose public functions to be used by app.js
    return {
        saveDataForUser,
        savePreferencesForUser,
        loadUser,
        registerUser,
        searchUsdaApi
    };
})();
