# Freilifts - A Modern Fitness PWA

Freilifts is a lightweight, installable Progressive Web App (PWA) designed for tracking workouts, nutrition, and overall fitness progress. Built with vanilla JavaScript and Firebase, it offers real-time data synchronization and full offline functionality.

It's designed to be a fast, private, and powerful alternative to commercial fitness apps.

[//]: # (TODO: Add a link to your live demo here!)
<!-- <p align="center">
  <a href="YOUR_LIVE_DEMO_URL_HERE"><strong>View Live Demo »</strong></a>
</p> -->

[//]: # (TODO: Add a screenshot or GIF of the app in action!)
<!-- <p align="center">
  <img src="URL_TO_YOUR_SCREENSHOT.png" alt="Freilifts App Screenshot" width="800">
</p> -->

## ✨ Features

### Workout Logging
- **New Modern Interface:** Log workouts exercise-by-exercise with a new card-based UI.
- **Set-by-Set Tracking:** Log each set individually with dedicated fields for weight and reps.
- **Stepper Controls:** Quickly adjust weight and reps with `+` and `-` buttons in customizable increments.
- **Auto-Inherit Sets:** Each new set automatically inherits the data from the previous set for faster logging.
- **Inline Rest Timer:** After completing a set, a rest timer automatically appears right where you need it.
- **Multi-Workout Days:** Log up to three distinct workouts per day (e.g., morning cardio, evening lifting).
- **Daily & Historical View:** Use the interactive calendar to create new logs or view and edit past workouts.

### Progress & Analytics
- **Personal Records (PRs):** Automatically calculates and displays your heaviest lift for every exercise.
- **Estimated 1-Rep Max (e1RM):** In addition to your PR, the app calculates your theoretical 1-Rep Max for every exercise, giving you a true measure of strength progression.
- **Interactive Charts:** View zoomable, pannable charts for body weight, calorie intake, and protein intake over time to visualize your progress.
- **Last Workout Summary:** A smart summary panel shows your last performance for a given workout category, with identical sets automatically grouped (e.g., "3 sets of 10 x 225lbs").

### Nutrition
- **Daily Food Log:** Track meals for Breakfast, Lunch, Dinner, and Snacks.
- **Dynamic Calorie & Macro Goals:** Automatically calculates daily targets based on your user profile and weight goals. The app dynamically uses your lowest recorded bodyweight for up-to-date targets.
- **Food Database Integration:**
    - Search the USDA FoodData Central API for nutritional information.
    - Look up products by typing or scanning a UPC barcode via the Open Food Facts API.
    - Remembers your previously used and custom foods for quick re-entry.

### Customization & Management
- **Exercise Library:** Start with a pre-filled list of common exercises and add, edit, or delete your own custom movements.
- **Categories:** Organize workouts and exercises with fully customizable categories (`Push`, `Pull`, `Legs`, `Upper Body`, etc.).
- **User-Selectable Themes:** Choose from multiple themes (Light, Dark, Forest) to personalize your experience.
- **Weight History Management:** "Reset" your bodyweight history so returning users can establish a new baseline for goal calculations without deleting old data.

### Core Technology
- **Progressive Web App (PWA):** Installable as a standalone app on desktop (Windows, macOS, Linux) and mobile (iOS, Android) for a native-like experience.
- **Offline First:** A Service Worker caches all application files, allowing the app to load and function completely without an internet connection. Data syncs automatically when you're back online.
- **Secure Authentication:** Simple and secure name/PIN-based authentication with all user data stored separately in Firebase.
- **Admin Panel:** A special "Users" tab for administrators to view all registered users, see their online status, reset PINs, and manage accounts.

## 💻 Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+ Modules)
- **Database:** Firebase Realtime Database
- **Charting:** Chart.js with plugins for annotations and zoom.
- **APIs:**
    - USDA FoodData Central API
    - Open Food Facts API
- **PWA:** Manifest, Service Worker
- **Deployment:** Configured for any static hosting provider (e.g., GitHub Pages, Netlify, Vercel, Nginx).

## 🚀 Project Setup & Configuration

To run this project yourself, you will need to configure your own backend and API keys.

#### 1. Firebase Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Create a new **Realtime Database**. Start in **locked mode**.
3. In your project settings, add a new **Web App**.
4. Copy the `firebaseConfig` object and paste it into `js/app.js`, replacing the placeholder.
5. In the Firebase Console, go to your Realtime Database **Rules** tab and paste in the provided security rules to secure user data. (Refer to original README for rule contents).
6. **IMPORTANT:** In the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials) for your project, restrict your Firebase API key to your website's domain to prevent unauthorized use.

#### 2. USDA API Key
1. Go to the [USDA FoodData Central API website](https://fdc.nal.usda.gov/api-key-signup.html) to request a free API key.
2. Open `js/app.js` and replace the placeholder key with your own.

#### 3. Icons
The `manifest.json` file points to icons in an `/icons/` directory. You must create your own `icon-192x192.png` and `icon-512x512.png` files and place them in that folder for the PWA installation to work correctly.