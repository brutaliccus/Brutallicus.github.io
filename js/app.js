document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyDSb6HjEPLfkcgUA-MKJxyWwkjdCjZHj2k",
        authDomain: "freilifts-app.firebaseapp.com",
        databaseURL: "https://freilifts-app-default-rtdb.firebaseio.com",
        projectId: "freilifts-app",
        storageBucket: "freilifts-app.firebasestorage.app",
        messagingSenderId: "631799148653",
        appId: "1:631799148653:web:bbf030eba362eb7312cf64"
    };
    const USDA_API_KEY = 'aemBTeknGhNmAlKKGpJUiewRCOMdaAVYlAtK91an';
    
    // Initialize Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();


    // --- 2. APPLICATION STATE ---
    // A single source of truth for all dynamic app data.
    const state = {
        currentUserId: null,
        exercises: [],
        workouts: [],
        foodLogs: {},
        uniqueFoods: [],
        userGoals: {},
        about: {},
        workoutTemplates: []
    };

    // Global modules - will be initialized after login.
    let workoutModule, exerciseModule, foodModule, foodApiModule, profileModule, progressModule, userAdminModule, programsModule;

    /**
     * Provides read-only access to the application state.
     * @returns {object} The current state.
     */
    const getState = () => state;


    // --- 3. DOM ELEMENT REFERENCES ---
    // Centralized references to all key DOM elements.
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const authError = document.getElementById('auth-error');
    const userNameDisplay = document.getElementById('user-name-display');
    const logoutBtn = document.getElementById('logout-btn');
    const themeSwitcher = document.getElementById('theme-switcher');
    const tabNav = document.getElementById('tab-nav');
    const tabContents = document.querySelectorAll('.tab-content');
    const adminUsersTabBtn = document.getElementById('admin-users-tab-btn');
    const settingsMenuBtn = document.getElementById('settings-menu-btn');
    const settingsDropdown = document.getElementById('settings-dropdown');


    // --- 4. UTILITY & HELPER FUNCTIONS ---

    /**
     * Sanitizes a string to be used as a Firebase key (e.g., a username).
     * @param {string} name - The input string.
     * @returns {string} The sanitized string.
     */
    const sanitizeNameForId = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    /**
     * Formats a 'YYYY-MM-DD' date string into a more readable format.
     * @param {string} dateString - The date string to format.
     * @returns {string} The formatted date.
     */
    const formatDate = (dateString) => {
        if (!dateString || !dateString.includes('-')) return dateString;
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    /**
     * Gets today's date as a 'YYYY-MM-DD' string.
     * @returns {string} Today's date string.
     */
    const getTodayDateString = () => new Date().toISOString().split('T')[0];

    /**
     * Calculates the estimated 1-Rep Max (e1RM) using the Brzycki formula.
     * @param {number} weight - The weight lifted.
     * @param {number} reps - The number of repetitions performed.
     * @returns {number} The estimated 1-Rep Max.
     */
    const calculateE1RM = (weight, reps) => {
        const w = parseFloat(weight);
        const r = parseInt(reps, 10);
        if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return 0;
        if (r === 1) return w;
        // Brzycki formula is most accurate for reps < 10 but will be calculated regardless.
        return w / (1.0278 - 0.0278 * r);
    };

    /**
     * Displays a custom confirmation modal and returns a promise that resolves with the user's choice.
     * @param {string} message - The question to ask the user.
     * @param {string} [title='Are you sure?'] - The title for the modal.
     * @returns {Promise<boolean>} - A promise that resolves to `true` if confirmed, `false` otherwise.
     */
    function showConfirmation(message, title = 'Are you sure?') {
        const modal = document.getElementById('confirmation-modal');
        const titleEl = document.getElementById('confirmation-title');
        const messageEl = document.getElementById('confirmation-message');
        const confirmBtn = document.getElementById('confirmation-confirm-btn');
        const cancelBtn = document.getElementById('confirmation-cancel-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.style.display = 'flex';

        return new Promise((resolve) => {
            const close = (result) => {
                modal.style.display = 'none';
                resolve(result);
            };

            confirmBtn.onclick = () => close(true);
            cancelBtn.onclick = () => close(false);
        });
    }


    // --- 5. CORE APP UI & LOGIC ---

    /**
     * Hides the authentication screen and shows the main application.
     */
    const showApp = () => {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
    };

    /**
     * Hides the main application and shows the authentication screen.
     */
    const showAuth = () => {
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    };

    /**
     * Applies a visual theme to the app and saves the preference.
     * @param {string} themeName - The name of the theme class (e.g., 'theme-dark').
     */
    const applyTheme = (themeName) => {
        document.body.className = '';
        document.body.classList.add(themeName);
        localStorage.setItem('freilifts_theme', themeName);
        if (state.currentUserId) {
            db.ref(`users/${state.currentUserId}/preferences/theme`).set(themeName);
        }
    };

    /**
     * Loads the saved theme from localStorage on initial app load.
     */
    const loadTheme = () => {
        const savedTheme = localStorage.getItem('freilifts_theme') || 'theme-dark';
        themeSwitcher.value = savedTheme;
        applyTheme(savedTheme);
    };

    /**
     * Switches the visible content tab in the main application.
     * @param {string} tabId - The ID of the tab to display.
     */
    const switchTab = (tabId) => {
        // Update button active states
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`.tab-button[data-tab="${tabId}"]`).forEach(b => b.classList.add('active'));

        // Update content visibility
        tabContents.forEach(c => c.classList.toggle('active', c.id === tabId));

        // Trigger render functions for modules that need to refresh on tab switch
        if (tabId === 'tab-workout-log' && workoutModule) workoutModule.render();
        if (tabId === 'tab-manage-exercises' && exerciseModule) exerciseModule.render();
        if (tabId === 'tab-food-log' && foodModule) foodModule.render();
        if (tabId === 'tab-programs' && programsModule) programsModule.render();
        if (tabId === 'tab-personal-records' && profileModule) profileModule.renderPRs();
        if (tabId === 'tab-my-progress' && progressModule) progressModule.render();
        if (tabId === 'tab-about-me' && profileModule) profileModule.renderAboutMe();
        if (tabId === 'tab-users' && userAdminModule) userAdminModule.render();
    };


    // --- 6. DATA & FIREBASE INTERACTION ---

    /**
     * Saves the user's primary data collections to Firebase.
     */
    const saveDataToFirebase = () => {
        if (!state.currentUserId) return;
        const userData = {
            exercises: state.exercises,
            workouts: state.workouts,
            foodLogs: state.foodLogs,
            uniqueFoods: state.uniqueFoods,
            workoutTemplates: state.workoutTemplates
        };
        db.ref(`users/${state.currentUserId}/data`).set(userData);
    };

    /**
     * Calculates the user's dynamic calorie and macro goals.
     * @returns {object} An object containing goals, the weight used for calculation, and maintenance calories.
     */
    function calculateCurrentGoals() {
        const { about, workouts } = getState();
        if (!about || !about.age || !about.height) {
            return { goals: { calories: 0, protein: 0, fat: 0, carbs: 0 }, weightUsed: 0, maintenance: 0 };
        }

        const startWeight = parseFloat(about.startWeight) || 0;
        const goalWeight = parseFloat(about.goalWeight) || 0;
        const resetDate = about.bodyweightResetDate ? new Date(about.bodyweightResetDate) : null;

        const loggedWeights = workouts
            .filter(w => {
                if (resetDate) {
                    const workoutDate = new Date(w.date + 'T00:00:00');
                    return workoutDate >= resetDate;
                }
                return true;
            })
            .map(w => parseFloat(w.bodyweight))
            .filter(bw => bw > 0);

        const allWeights = startWeight > 0 ? [startWeight, ...loggedWeights] : loggedWeights;
        const lowestWeight = allWeights.length > 0 ? Math.min(...allWeights) : 0;
        const weightToUse = lowestWeight > 0 ? lowestWeight : startWeight;

        if (weightToUse === 0) {
            return { goals: { calories: 0, protein: 0, fat: 0, carbs: 0 }, weightUsed: 0, maintenance: 0 };
        }

        // Mifflin-St Jeor BMR Calculation
        const sex = about.sex || 'male';
        const age = parseFloat(about.age);
        const heightIn = parseFloat(about.height);
        const activityMultiplier = parseFloat(about.activityLevel) || 1.55;
        const weightKg = weightToUse * 0.453592;
        const heightCm = heightIn * 2.54;

        const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (sex === 'male' ? 5 : -161);
        const tdee = bmr * activityMultiplier; // Total Daily Energy Expenditure (Maintenance)

        // Adjust TDEE based on goal
        let goalCalories = tdee;
        if (goalWeight > 0) {
            if (goalWeight < weightToUse) { // Weight loss
                goalCalories = tdee - 500;
            } else if (goalWeight > weightToUse) { // Weight gain
                goalCalories = tdee + 300;
            }
        }

        // Macro calculation
        const proteinGoalWeight = goalWeight > 0 ? goalWeight : weightToUse;
        const targetProtein = proteinGoalWeight * 0.7; // 0.7g per lb of bodyweight
        const targetFat = (goalCalories * 0.25) / 9; // 25% of calories from fat
        const targetCarbs = (goalCalories - (targetProtein * 4) - (targetFat * 9)) / 4;

        const goals = { calories: goalCalories, protein: targetProtein, fat: targetFat, carbs: targetCarbs };
        state.userGoals = goals;
        return { goals, weightUsed: weightToUse, maintenance: tdee };
    }

    /**
     * The main function to run after a user successfully logs in.
     * Fetches data, initializes modules, and displays the app.
     * @param {string} userId - The user's sanitized ID.
     * @param {string} userName - The user's display name.
     */
    const loadUserAndInitializeApp = (userId, userName) => {
        // 1. Update state and UI for login
        state.currentUserId = userId;
        localStorage.setItem('freilifts_loggedInUser', JSON.stringify({ id: userId, name: userName }));
        userNameDisplay.textContent = `Welcome, ${userName}`;
        showApp();

        // 2. Set up Firebase online presence monitoring
        const userStatusDatabaseRef = db.ref(`/status/${userId}`);
        const isOfflineForDatabase = { state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP };
        const isOnlineForDatabase = { state: 'online', last_changed: firebase.database.ServerValue.TIMESTAMP };

        db.ref('.info/connected').on('value', (snapshot) => {
            if (!snapshot.val()) return; // If we lose connection, onDisconnect will handle it.
            userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
                userStatusDatabaseRef.set(isOnlineForDatabase);
            });
        });

        // 3. Fetch all user data from Firebase
        db.ref('users/' + userId).once('value', (snapshot) => {
            if (!snapshot.exists()) {
                alert("Error: Could not load your data. Logging out.");
                logoutBtn.click();
                return;
            }

            const userData = snapshot.val() || {};
            const data = userData.data || {};
            const prefs = userData.preferences || {};

            // 4. Hydrate the application state with fetched data
            state.workouts = data.workouts || [];
            state.workoutTemplates = data.workoutTemplates || [];
            state.foodLogs = data.foodLogs || {};
            state.uniqueFoods = data.uniqueFoods || [];
            state.about = prefs.about || {};
            state.about.bodyweightResetDate = prefs.bodyweightResetDate || null;
            state.userGoals = prefs.goals || {};

            // 5. Merge predefined exercises with user's list
            let userExercises = data.exercises || [];
            const existingExerciseNames = new Set(userExercises.map(ex => ex.name.toLowerCase()));
            let newExercisesAdded = false;
            PREDEFINED_EXERCISES.forEach(predefinedEx => {
                if (!existingExerciseNames.has(predefinedEx.name.toLowerCase())) {
                    userExercises.push({ ...predefinedEx, id: Date.now() + Math.random() });
                    newExercisesAdded = true;
                }
            });
            state.exercises = userExercises;
            if (newExercisesAdded) {
                db.ref(`users/${state.currentUserId}/data/exercises`).set(state.exercises);
            }

            // 6. Set user-specific UI elements (admin tab, theme)
            if (userData.isAdmin) {
                adminUsersTabBtn.style.display = 'block';
            }
            const userTheme = prefs.theme || 'theme-dark';
            themeSwitcher.value = userTheme;
            applyTheme(userTheme);

            // 7. Initialize all application modules
            foodApiModule = createFoodApiModule({ USDA_API_KEY });
            workoutModule = createWorkoutModule();
            exerciseModule = createExerciseModule();
            foodModule = createFoodModule();
            profileModule = createProfileModule();
            progressModule = createProgressModule();
            userAdminModule = createUserAdminModule();
            programsModule = createProgramsModule();

            // 8. Create the Module API object to pass to modules
            const moduleApi = {
                db,
                getState,
                saveDataToFirebase,
                switchTab,
                getTodayDateString,
                foodApi: foodApiModule,
                sanitizeNameForId,
                calculateCurrentGoals,
                formatDate,
                calculateE1RM,
                showConfirmation
            };

            // 9. Initialize modules with the API
            workoutModule.init(moduleApi);
            exerciseModule.init(moduleApi);
            foodModule.init(moduleApi);
            profileModule.init(moduleApi);
            progressModule.init(moduleApi);
            userAdminModule.init(moduleApi);
            programsModule.init(moduleApi);

            // 10. Navigate to the initial tab
            const hasAboutMeData = !!(state.about && state.about.age);
            const initialTab = hasAboutMeData ? 'tab-workout-log' : 'tab-about-me';
            switchTab(initialTab);
        });
    };


    // --- 7. EVENT BINDING ---

    /**
     * Binds event listeners for the settings dropdown menu.
     */
    function bindSettingsMenuEvents() {
        settingsMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsDropdown.style.display = settingsDropdown.style.display === 'block' ? 'none' : 'block';
        });

        settingsDropdown.addEventListener('click', (e) => {
            const target = e.target.closest('.dropdown-item');
            if (!target) return;

            // If a tab button or logout is clicked, perform action and close dropdown
            if (target.matches('.tab-button') || target.id === 'logout-btn') {
                if (target.matches('.tab-button')) {
                    switchTab(target.dataset.tab);
                }
                settingsDropdown.style.display = 'none';
            }
        });

        // Close dropdown if clicking outside of it
        window.addEventListener('click', (e) => {
            if (settingsDropdown.style.display === 'block' && !settingsMenuBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
                settingsDropdown.style.display = 'none';
            }
        });
    }

    /**
     * Binds all global event listeners for authentication, navigation, and theme switching.
     */
    function bindGlobalEvents() {
        // Auth form switching
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            authError.textContent = '';
        });
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            authError.textContent = '';
        });

        // Registration
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            authError.textContent = '';
            const name = document.getElementById('register-name').value;
            const pin = document.getElementById('register-pin').value;
            const userId = sanitizeNameForId(name);

            if (!userId) { authError.textContent = 'Name cannot be empty.'; return; }
            if (pin.length < 4) { authError.textContent = 'PIN must be at least 4 characters.'; return; }

            const userRef = db.ref('users/' + userId);
            userRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    authError.textContent = 'This name is already taken.';
                } else {
                    userRef.set({ name, pin, data: { exercises: PREDEFINED_EXERCISES } })
                        .then(() => {
                            loadUserAndInitializeApp(userId, name);
                        });
                }
            });
        });

        // Login
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            authError.textContent = '';
            const name = document.getElementById('login-name').value;
            const pin = document.getElementById('login-pin').value;
            const userId = sanitizeNameForId(name);

            if (!userId) { authError.textContent = 'Please enter your name.'; return; }

            db.ref('users/' + userId).once('value', (snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    if (userData.pin === pin) {
                        loadUserAndInitializeApp(userId, userData.name);
                    } else {
                        authError.textContent = 'Incorrect PIN.';
                    }
                } else {
                    authError.textContent = 'User not found.';
                }
            });
        });

        // Main tab navigation
        tabNav.addEventListener('click', (e) => {
            if (e.target.matches('.tab-button')) {
                switchTab(e.target.dataset.tab);
            }
        });

        // Logout
        logoutBtn.addEventListener('click', () => {
            if (state.currentUserId) {
                db.ref('/status/' + state.currentUserId).set({ state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP });
            }
            state.currentUserId = null;
            localStorage.removeItem('freilifts_loggedInUser');
            location.reload();
        });

        // Theme switching
        themeSwitcher.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    }


    // --- 8. INITIALIZATION ---

    /**
     * The main entry point for the application.
     */
    const initializeApp = () => {
        loadTheme();
        bindGlobalEvents();
        bindSettingsMenuEvents();

        // Check for a remembered user in localStorage to auto-login
        const rememberedUser = JSON.parse(localStorage.getItem('freilifts_loggedInUser'));
        if (rememberedUser) {
            loadUserAndInitializeApp(rememberedUser.id, rememberedUser.name);
        } else {
            showAuth();
        }
    };

    // Run the app!
    initializeApp();
});


// --- SERVICE WORKER REGISTRATION ---
// Handles PWA functionality like offline caching.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.service-worker.js.register('/service-worker.js')
            .then(r => console.log('Service Worker registered.'))
            .catch(e => console.error('Service Worker registration failed:', e));
    });

    let refreshing;
    navigator.service-worker.js.addEventListener("controllerchange", () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
}
