// js/modules/reminders.js

function createRemindersModule() {
    // --- 1. Module State and Variables ---
    let db;
    let getState;
    let VAPID_PUBLIC_KEY;

    // --- 2. DOM Elements ---
    let enabledCheckbox, timeInput, timeContainer;

    // --- 3. Private Functions ---

    /**
     * Converts a VAPID key string to a Uint8Array.
     */
    function _urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Handles subscribing the user to push notifications and saving the subscription.
     */
    async function _subscribeUser() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert('Push messaging is not supported on this browser.');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('You have blocked notifications. To enable reminders, please allow notifications in your browser settings.');
                return false;
            }

            const serviceWorkerReg = await navigator.serviceWorker.ready;
            let subscription = await serviceWorkerReg.pushManager.getSubscription();

            if (subscription === null) {
                if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('YOUR_VAPID_PUBLIC_KEY')) {
                    alert("App configuration error: VAPID key is missing.");
                    return false;
                }
                subscription = await serviceWorkerReg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }

            // Save the subscription to Firebase for the backend to use.
            const userId = getState().currentUserId;
            const subRef = db.ref(`users/${userId}/pushSubscription`);
            await subRef.set(JSON.parse(JSON.stringify(subscription)));
            return true;

        } catch (error) {
            alert('An error occurred while setting up notifications.');
            return false;
        }
    }
    
    /**
     * Saves the reminder settings to Firebase, converting the time to UTC.
     */
    function _saveSettings() {
        const userId = getState().currentUserId;
        if (!userId) return;
        
        const localTime = timeInput.value;
        const [hours, minutes] = localTime.split(':');
        
        const localDate = new Date();
        localDate.setHours(hours, minutes, 0, 0);

        const utcHours = String(localDate.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(localDate.getUTCMinutes()).padStart(2, '0');
        const timeInUTC = `${utcHours}:${utcMinutes}`;
    
        const settings = {
            enabled: enabledCheckbox.checked,
            time: timeInUTC
        };

        const settingsRef = db.ref(`users/${userId}/preferences/supplementReminder`);
        settingsRef.set(settings);
    }

    // --- 4. Public `init` Method ---
    function init(api) {
        db = api.db;
        getState = api.getState;
        VAPID_PUBLIC_KEY = api.VAPID_PUBLIC_KEY;

        enabledCheckbox = document.getElementById('supplementReminderEnabled');
        timeInput = document.getElementById('supplementReminderTime');
        timeContainer = document.getElementById('reminderTimeContainer');

        const userId = getState().currentUserId;
        if (!userId) return;

        const settingsRef = db.ref(`users/${userId}/preferences/supplementReminder`);
        settingsRef.once('value', snapshot => {
            if (snapshot.exists()) {
                const settings = snapshot.val();
                enabledCheckbox.checked = settings.enabled || false;

                if (settings.time) {
                    const [utcHours, utcMinutes] = settings.time.split(':');
                    const tempDate = new Date();
                    tempDate.setUTCHours(utcHours, utcMinutes, 0, 0);
                    
                    const localHours = String(tempDate.getHours()).padStart(2, '0');
                    const localMinutes = String(tempDate.getMinutes()).padStart(2, '0');
                    timeInput.value = `${localHours}:${localMinutes}`;
                }

                timeContainer.style.display = settings.enabled ? 'block' : 'none';
            }
        });

        enabledCheckbox.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            timeContainer.style.display = isEnabled ? 'block' : 'none';

            if (isEnabled) {
                const success = await _subscribeUser();
                if (!success) {
                    e.target.checked = false;
                    timeContainer.style.display = 'none';
                    return; 
                }
            }
            _saveSettings();
        });

        timeInput.addEventListener('change', () => {
            if (enabledCheckbox.checked) {
                _saveSettings();
            }
        });
    }

    return {
        init
    };
}