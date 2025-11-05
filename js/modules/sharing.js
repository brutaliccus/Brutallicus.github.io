// js/modules/sharing.js (Cloud Function Version)

function createSharingModule() {
    // --- 1. Module State and Variables ---
    let db, getState, sanitizeNameForId;
    let currentWorkoutId, currentDate;

    // --- 2. DOM Elements ---
    let modal, closeBtn, form, recipientInput, errorEl;

    // --- 3. Private Functions ---
    async function _findUserByName(name) {
        const userIdToFind = sanitizeNameForId(name);
        const userRef = db.ref(`users/${userIdToFind}`);
        const snapshot = await userRef.once('value');
        if (snapshot.exists() && snapshot.val().name.toLowerCase() === name.toLowerCase()) {
            return userIdToFind;
        }
        const usersRef = db.ref('users');
        const query = usersRef.orderByChild('name').equalTo(name).limitToFirst(1);
        const querySnapshot = await query.once('value');
        if (querySnapshot.exists()) {
            return Object.keys(querySnapshot.val())[0];
        }
        return null;
    }

    async function handleShareSubmit(e) {
        e.preventDefault();
        errorEl.textContent = '';
        const targetUsername = recipientInput.value.trim();
        
        try {
            const receiverUid = await _findUserByName(targetUsername);
            if (!receiverUid) {
                errorEl.textContent = "User not found. Please check the name and try again.";
                return;
            }

            const workout = getState().workouts.find(w => w.id === currentWorkoutId);
            if (!workout) {
                errorEl.textContent = "Error: Could not find the workout to share.";
                return;
            }
            
            // ⭐ NEW LOGIC: Call the Cloud Function
            const createShare = firebase.functions().httpsCallable('createShare');
            
            await createShare({ 
                receiverUid: receiverUid,
                date: currentDate,
                workoutData: workout 
            });

            alert(`Workout shared with ${targetUsername}!`);
            closeModal();

        } catch (error) {
            // If the function call fails, Firebase provides a helpful error message.
            errorEl.textContent = error.message || "An error occurred. Please try again.";
        }
    }

    function closeModal() {
        form.reset();
        errorEl.textContent = '';
        modal.style.display = 'none';
    }
    
    // --- 4. Public Methods ---
    function openShareModal(workoutId, date) {
        currentWorkoutId = workoutId;
        currentDate = date;
        if (modal) {
            modal.style.display = 'flex';
            recipientInput.focus();
        }
    }
    
    function init(api) {
        db = api.db;
        getState = api.getState;
        sanitizeNameForId = api.sanitizeNameForId;
        
        modal = document.getElementById('share-workout-modal');
        closeBtn = document.getElementById('share-modal-close-btn');
        form = document.getElementById('share-workout-form');
        recipientInput = document.getElementById('share-recipient-name');
        errorEl = document.getElementById('share-error');

        if (modal && form && closeBtn) {
            form.addEventListener('submit', handleShareSubmit);
            closeBtn.addEventListener('click', closeModal);
        }
    }

    return {
        init,
        openShareModal
    };
}