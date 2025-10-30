document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURATION & INITIALIZATION ---
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
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // --- 2. APPLICATION STATE ---
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
    let workoutModule, exerciseModule, foodModule, foodApiModule, profileModule, progressModule, userAdminModule, programsModule;
    const getState = () => state;

    // --- 3. DOM ELEMENT REFERENCES ---
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
    const sanitizeNameForId = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const formatDate = (dateString) => {
        if (!dateString || !dateString.includes('-')) return dateString;
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const getTodayDateString = () => new Date().toISOString().split('T')[0];
    const calculateE1RM = (weight, reps) => {
        const w = parseFloat(weight);
        const r = parseInt(reps, 10);
        if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return 0;
        if (r === 1) return w;
        return w / (1.0278 - 0.0278 * r);
    };
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
    const showApp = () => { authContainer.style.display = 'none'; appContainer.style.display = 'block'; };
    const showAuth = () => { authContainer.style.display = 'flex'; appContainer.style.display = 'none'; };
    const applyTheme = (themeName) => {
        document.body.className = '';
        document.body.classList.add(themeName);
        localStorage.setItem('freilifts_theme', themeName);
        if (state.currentUserId) {
            db.ref(`users/${state.currentUserId}/preferences/theme`).set(themeName);
        }
    };
    const loadTheme = () => {
        const savedTheme = localStorage.getItem('freilifts_theme') || 'theme-dark';
        themeSwitcher.value = savedTheme;
        applyTheme(savedTheme);
    };
    const switchTab = (tabId) => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`.tab-button[data-tab="${tabId}"]`).forEach(b => b.classList.add('active'));
        tabContents.forEach(c => c.classList.toggle('active', c.id === tabId));
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
        const sex = about.sex || 'male';
        const age = parseFloat(about.age);
        const heightIn = parseFloat(about.height);
        const activityMultiplier = parseFloat(about.activityLevel) || 1.55;
        const weightKg = weightToUse * 0.453592;
        const heightCm = heightIn * 2.54;
        const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (sex === 'male' ? 5 : -161);
        const tdee = bmr * activityMultiplier;
        let goalCalories = tdee;
        if (goalWeight > 0) {
            if (goalWeight < weightToUse) {
                goalCalories = tdee - 500;
            } else if (goalWeight > weightToUse) {
                goalCalories = tdee + 300;
            }
        }
        const proteinGoalWeight = goalWeight > 0 ? goalWeight : weightToUse;
        const targetProtein = proteinGoalWeight * 0.7;
        const targetFat = (goalCalories * 0.25) / 9;
        const targetCarbs = (goalCalories - (targetProtein * 4) - (targetFat * 9)) / 4;
        const goals = { calories: goalCalories, protein: targetProtein, fat: targetFat, carbs: targetCarbs };
        state.userGoals = goals;
        return { goals, weightUsed: weightToUse, maintenance: tdee };
    }

    const loadUserAndInitializeApp = (userId, userName) => {
        state.currentUserId = userId;
        localStorage.setItem('freilifts_loggedInUser', JSON.stringify({ id: userId, name: userName }));
        userNameDisplay.textContent = `Welcome, ${userName}`;
        showApp();
        
        const userStatusDatabaseRef = db.ref(`/status/${userId}`);
        const isOfflineForDatabase = { state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP };
        const isOnlineForDatabase = { state: 'online', last_changed: firebase.database.ServerValue.TIMESTAMP };
        db.ref('.info/connected').on('value', (snapshot) => {
            if (!snapshot.val()) return;
            userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
                userStatusDatabaseRef.set(isOnlineForDatabase);
            });
        });

        db.ref('users/' + userId).once('value', (snapshot) => {
            if (!snapshot.exists()) {
                alert("Error: Could not load your data. Logging out.");
                logoutBtn.click();
                return;
            }
            const userData = snapshot.val() || {};
            const data = userData.data || {};
            const prefs = userData.preferences || {};
            
            // --- DATA MIGRATION FOR WORKOUT & EXERCISE IDs & MUSCLE GROUPS ---
            let workouts = data.workouts || [];
            let exercises = data.exercises || [];
            let needsSave = false;

            // 1. Ensure all workouts have a unique ID
            workouts.forEach(w => {
                if (!w.id) {
                    w.id = Date.now() + Math.random();
                    needsSave = true;
                }
            });

            // 2. Ensure all exercises have an ID and update them with muscle group data
            const predefinedMap = new Map(PREDEFINED_EXERCISES.map(p_ex => [p_ex.name.toLowerCase(), p_ex]));
            
            exercises.forEach(user_ex => {
                // Assign ID if missing
                if (!user_ex.id) {
                    user_ex.id = Date.now() + Math.random();
                    needsSave = true;
                }
                // Update with muscle groups if not already updated
                if (!user_ex.primaryMuscle) {
                    const predefinedData = predefinedMap.get(user_ex.name.toLowerCase());
                    if (predefinedData) {
                        user_ex.primaryMuscle = predefinedData.primaryMuscle;
                        user_ex.secondaryMuscles = predefinedData.secondaryMuscles;
                        delete user_ex.category; // Clean up old property
                        needsSave = true;
                    }
                }
            });

            // 3. Add any brand-new predefined exercises the user is missing
            const userExerciseNames = new Set(exercises.map(ex => ex.name.toLowerCase()));
            PREDEFINED_EXERCISES.forEach(p_ex => {
                if (!userExerciseNames.has(p_ex.name.toLowerCase())) {
                    exercises.push({ ...p_ex, id: Date.now() + Math.random() });
                    needsSave = true;
                }
            });

            if (needsSave) {
                console.log("Updating data model: assigning IDs and muscle groups...");
                // Use update to avoid overwriting other data properties if they exist
                db.ref(`users/${userId}/data`).update({ workouts, exercises });
            }
            // --- END MIGRATION ---

            state.workouts = workouts;
            state.exercises = exercises;
            state.workoutTemplates = data.workoutTemplates || [];
            state.foodLogs = data.foodLogs || {};
            state.uniqueFoods = data.uniqueFoods || [];
            state.about = prefs.about || {};
            state.about.bodyweightResetDate = prefs.bodyweightResetDate || null;
            state.userGoals = prefs.goals || {};
            
            if (userData.isAdmin) {
                adminUsersTabBtn.style.display = 'block';
            }
            const userTheme = prefs.theme || 'theme-dark';
            themeSwitcher.value = userTheme;
            applyTheme(userTheme);

            // Initialize all modules
            foodApiModule = createFoodApiModule({ USDA_API_KEY });
            workoutModule = createWorkoutModule();
            exerciseModule = createExerciseModule();
            foodModule = createFoodModule();
            profileModule = createProfileModule();
            progressModule = createProgressModule();
            userAdminModule = createUserAdminModule();
            programsModule = createProgramsModule();
            
            const moduleApi = { db, getState, saveDataToFirebase, switchTab, getTodayDateString, foodApi: foodApiModule, sanitizeNameForId, calculateCurrentGoals, formatDate, calculateE1RM, showConfirmation };
            
            workoutModule.init(moduleApi);
            exerciseModule.init(moduleApi);
            foodModule.init(moduleApi);
            profileModule.init(moduleApi);
            progressModule.init(moduleApi);
            userAdminModule.init(moduleApi);
            programsModule.init(moduleApi);
            
            const hasAboutMeData = !!(state.about && state.about.age);
            const initialTab = hasAboutMeData ? 'tab-workout-log' : 'tab-about-me';
            switchTab(initialTab);
        });
    };

    // --- 7. EVENT BINDING ---
    function bindSettingsMenuEvents() {
        settingsMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsDropdown.style.display = settingsDropdown.style.display === 'block' ? 'none' : 'block';
        });
        settingsDropdown.addEventListener('click', (e) => {
            const target = e.target.closest('.dropdown-item');
            if (!target) return;
            if (target.matches('.tab-button') || target.id === 'logout-btn') {
                if (target.matches('.tab-button')) {
                    switchTab(target.dataset.tab);
                }
                settingsDropdown.style.display = 'none';
            }
        });
        window.addEventListener('click', (e) => {
            if (settingsDropdown.style.display === 'block' && !settingsMenuBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
                settingsDropdown.style.display = 'none';
            }
        });
    }
    function bindGlobalEvents() {
        showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; authError.textContent = ''; });
        showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'block'; registerForm.style.display = 'none'; authError.textContent = ''; });
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
                    const initialExercises = PREDEFINED_EXERCISES.map(ex => ({...ex, id: Date.now() + Math.random()}));
                    userRef.set({ name, pin, data: { exercises: initialExercises } })
                        .then(() => {
                            loadUserAndInitializeApp(userId, name);
                        });
                }
            });
        });
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
        tabNav.addEventListener('click', (e) => { if (e.target.matches('.tab-button')) { switchTab(e.target.dataset.tab); } });
        logoutBtn.addEventListener('click', () => {
            if (state.currentUserId) {
                db.ref('/status/' + state.currentUserId).set({ state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP });
            }
            state.currentUserId = null;
            localStorage.removeItem('freilifts_loggedInUser');
            location.reload();
        });
        themeSwitcher.addEventListener('change', (e) => { applyTheme(e.target.value); });
    }

    // --- 8. INITIALIZATION ---
    const initializeApp = () => {
        loadTheme();
        bindGlobalEvents();
        bindSettingsMenuEvents();
        const rememberedUser = JSON.parse(localStorage.getItem('freilifts_loggedInUser'));
        if (rememberedUser) {
            loadUserAndInitializeApp(rememberedUser.id, rememberedUser.name);
        } else {
            showAuth();
        }
    };
    initializeApp();
});

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(r => console.log('Service Worker registered.'))
            .catch(e => console.error('SW registration failed:', e));
    });
    let refreshing;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
}