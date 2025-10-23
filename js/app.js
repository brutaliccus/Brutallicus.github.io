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
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    
    const state = {
        currentUserId: null, exercises: [], workouts: [], foodLogs: {}, uniqueFoods: [], userGoals: {},
        about: {}
    };
    const getState = () => state;
    
    let workoutModule, exerciseModule, foodModule, profileModule, progressModule, userAdminModule;

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

    const sanitizeNameForId = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const formatDate = (dateString) => {
    if (!dateString || !dateString.includes('-')) return dateString; // Return original if invalid
    // Create a date object, ensuring it's treated as local time, not UTC
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};
    const showApp = () => { authContainer.style.display = 'none'; appContainer.style.display = 'block'; };
    const showAuth = () => { authContainer.style.display = 'flex'; appContainer.style.display = 'none'; };
    const getTodayDateString = () => new Date().toISOString().split('T')[0];

    const applyTheme = (themeName) => {
        document.body.className = ''; document.body.classList.add(themeName);
        localStorage.setItem('freilifts_theme', themeName);
        if (state.currentUserId) { db.ref(`users/${state.currentUserId}/preferences/theme`).set(themeName); }
    };
    const loadTheme = () => {
        const savedTheme = localStorage.getItem('freilifts_theme') || 'theme-dark';
        themeSwitcher.value = savedTheme; applyTheme(savedTheme);
    };
    const switchTab = (tabId) => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        tabContents.forEach(c => c.classList.toggle('active', c.id === tabId));
        if (tabId === 'tab-workout-log' && workoutModule) workoutModule.render();
        if (tabId === 'tab-manage-exercises' && exerciseModule) exerciseModule.render();
        if (tabId === 'tab-food-log' && foodModule) foodModule.render();
        if (tabId === 'tab-personal-records' && profileModule) profileModule.renderPRs();
        if (tabId === 'tab-my-progress' && progressModule) progressModule.render();
        if (tabId === 'tab-about-me' && profileModule) profileModule.renderAboutMe();
        if (tabId === 'tab-users' && userAdminModule) userAdminModule.render();
    };
    const saveDataToFirebase = () => {
        if (!state.currentUserId) return;
        const userData = { exercises: state.exercises, workouts: state.workouts, foodLogs: state.foodLogs, uniqueFoods: state.uniqueFoods };
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
            if (goalWeight < weightToUse) goalCalories = tdee - 500;
            else if (goalWeight > weightToUse) goalCalories = tdee + 300;
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

        const userStatusDatabaseRef = db.ref('/status/' + userId);
        const isOfflineForDatabase = { state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP };
        const isOnlineForDatabase = { state: 'online', last_changed: firebase.database.ServerValue.TIMESTAMP };
        db.ref('.info/connected').on('value', (snapshot) => {
            if (!snapshot.val()) return;
            userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => userStatusDatabaseRef.set(isOnlineForDatabase));
        });

        db.ref('users/' + userId).once('value', (snapshot) => {
            if (!snapshot.exists()) {
                alert("Error: Could not load your data.");
                logoutBtn.click();
                return;
            }
            const userData = snapshot.val() || {};
            const data = userData.data || {};
            const prefs = userData.preferences || {};

            state.workouts = data.workouts || [];
            state.foodLogs = data.foodLogs || {};
            state.uniqueFoods = data.uniqueFoods || [];
            state.about = prefs.about || {};
            state.about.bodyweightResetDate = prefs.bodyweightResetDate || null;
            state.userGoals = prefs.goals || {};
            
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

            if (userData.isAdmin) { adminUsersTabBtn.style.display = 'inline-block'; }
            
            const userTheme = prefs.theme || 'theme-dark';
            themeSwitcher.value = userTheme;
            applyTheme(userTheme);
            
            workoutModule = createWorkoutModule();
            exerciseModule = createExerciseModule();
            foodModule = createFoodModule();
            profileModule = createProfileModule();
            progressModule = createProgressModule();
            userAdminModule = createUserAdminModule();

            const moduleApi = { db, getState, saveDataToFirebase, switchTab, getTodayDateString, USDA_API_KEY, sanitizeNameForId, calculateCurrentGoals, formatDate }; workoutModule.init(moduleApi);

            workoutModule.init(moduleApi);
            exerciseModule.init(moduleApi);
            foodModule.init(moduleApi);
            profileModule.init(moduleApi);
            progressModule.init(moduleApi);
            userAdminModule.init(moduleApi);
            
            const hasAboutMeData = !!prefs.about;
            const initialTab = hasAboutMeData ? 'tab-workout-log' : 'tab-about-me';
            switchTab(initialTab);
        });
    };

    themeSwitcher.addEventListener('change', (e) => applyTheme(e.target.value));
    tabNav.addEventListener('click', (e) => { if (e.target.matches('.tab-button')) switchTab(e.target.dataset.tab); });
    logoutBtn.addEventListener('click', () => {
        if (state.currentUserId) {
            db.ref('/status/' + state.currentUserId).set({ state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP });
        }
        state.currentUserId = null; localStorage.removeItem('freilifts_loggedInUser'); location.reload();
    });
    showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; authError.textContent = ''; });
    showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'block'; registerForm.style.display = 'none'; authError.textContent = ''; });
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault(); authError.textContent = '';
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
                userRef.set({ name, pin, data: { exercises: PREDEFINED_EXERCISES } }).then(() => {
                    loadUserAndInitializeApp(userId, name);
                });
            }
        });
    });
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); authError.textContent = '';
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
    const initializeApp = () => {
        loadTheme();
        const rememberedUser = JSON.parse(localStorage.getItem('freilifts_loggedInUser'));
        if (rememberedUser) {
            loadUserAndInitializeApp(rememberedUser.id, rememberedUser.name);
        } else {
            showAuth();
        }
    };
    initializeApp();
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(r => console.log('SW registered')).catch(e => console.error('SW registration failed:', e));
  });
}
let refreshing;
navigator.serviceWorker.addEventListener("controllerchange", () => {
  if (refreshing) return;
  window.location.reload();
  refreshing = true;
});
