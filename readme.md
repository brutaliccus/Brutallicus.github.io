# Freilifts - A Fitness PWA

Freilifts is a lightweight, installable Progressive Web App (PWA) designed for tracking workouts, nutrition, and overall fitness progress. It uses Firebase for real-time data synchronization and can be run completely offline.

## Features

### Workout Logging
- **Interactive Calendar**: A full-week calendar view allows for quick navigation and selection of workout dates. Days with logged workouts are clearly marked with a color-coded bar indicating the workout type.
- **Detailed Logging**: Create daily workout logs categorized by Push, Pull, Legs, or Other. Log individual exercises with weight, sets, and reps.
- **Workout Duration Timer**: A workout timer automatically starts when a new workout is created and stops when it's marked as "Finished". The total duration is saved with the log.
- **Rest Timer**: A separate, manual-start stopwatch for timing rest periods between sets, complete with Start, Pause, and Resume functionality.
- **Last Workout Summary**: A side panel that automatically displays your last workout of a given category (e.g., your last "Push" day) for quick reference on your current session's lifts.

### Nutrition & Food Logging
- **Interactive Food Calendar**: A dedicated calendar for the food log, showing at-a-glance the total calories and protein for each logged day. The display is color-coded based on whether you are under, at, or over your calorie goal.
- **Meal & Macro Tracking**: Keep a daily food log categorized by Breakfast, Lunch, Dinner, and Snacks.
- **Smart Meal Selection**: The meal dropdown intelligently defaults to the appropriate meal based on the time of day and remembers your last selection for faster consecutive entries.
- **Food Database Integration**:
    - Search the USDA FoodData Central API for nutritional information.
    - Look up products by typing or scanning a UPC barcode via the Open Food Facts API.
    - Manually enter custom foods or recipes with their specific macros.
    - Remembers previously logged foods for quick re-entry.

### Progress & Data
- **Dynamic Calorie Goals**: Automatically calculates daily calorie and macronutrient goals based on user profile data (age, height, activity level) and dynamically uses the lowest recorded bodyweight for up-to-date targets.
- **Weight History Management**: Ability to "reset" bodyweight history, so returning users can establish a new baseline weight for goal calculations without deleting old workout data.
- **Exercise Management**: A pre-filled list of common exercises is provided. Users can add, edit, and delete their own custom exercises, including import via CSV.
- **Progress Charts**: View interactive, zoomable charts for body weight, calorie intake, and protein intake over time.
- **Personal Records**: Automatically calculates and displays your personal record (heaviest weight lifted) for every exercise, grouped by category.

### Core System
- **PWA Functionality**:
    - **Installable**: Can be installed as a standalone app on desktop and mobile.
    - **Offline Support**: Uses a Service Worker to cache all application files, allowing the app to run without an internet connection.
- **User System**:
    - Simple and secure name/PIN-based authentication.
    - All user data is stored separately and securely in Firebase.
- **Customization**: Includes multiple user-selectable themes (Light, Dark, Forest).
- **Admin Panel**: An administrator-only tab to view all registered users, see their online status, reset PINs, and delete user accounts.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+ Modules)
- **Database**: Firebase Realtime Database
- **Charting**: Chart.js with plugins for annotations and zoom.
- **APIs**:
    - USDA FoodData Central API
    - Open Food Facts API
- **PWA**: Manifest, Service Worker
- **Deployment**: Configured for static hosting (e.g., GitHub Pages, Nginx).

## Project Setup & Configuration

To run this project, you will need to configure your own backend and API keys.

### 1. Firebase Setup
1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  Create a new **Realtime Database**.
3.  In your project settings, add a new **Web App** and copy the `firebaseConfig` object.
4.  In `js/app.js`, replace the placeholder `firebaseConfig` object with your own.
5.  In the Firebase Console, go to **Authentication** > **Settings** > **Authorized domains** and add the domain where you will host the app (e.g., `your-domain.com`, `localhost`).
6.  Secure your database by updating the **Realtime Database > Rules** tab.

### 2. USDA API Key
1.  Request a free API key from the [USDA FoodData Central API website](https://fdc.nal.usda.gov/api-key-signup.html).
2.  In `js/app.js`, replace the placeholder `USDA_API_KEY` with your own.

### 3. Deployment
The app is built to be deployed on any static web host. For servers like Nginx, a `try_files` directive is necessary to handle the client-side routing of this Single Page Application (SPA).

Example Nginx `location` block:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}