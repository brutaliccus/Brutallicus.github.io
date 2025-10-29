// predefined-exercises.js

const PREDEFINED_EXERCISES = [
    // Shoulders
    { name: 'Arnold Press', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'] },
    { name: 'Dumbbell Front Raise', primaryMuscle: 'Shoulders', secondaryMuscles: [] },
    { name: 'Dumbbell Lateral Raise', primaryMuscle: 'Shoulders', secondaryMuscles: [] },
    { name: 'Cable Lateral Raise', primaryMuscle: 'Shoulders', secondaryMuscles: [] },
    { name: 'Machine Shoulder Press', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'] },
    { name: 'Overhead Press (Barbell)', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'] },
    { name: 'Plate Front Raise', primaryMuscle: 'Shoulders', secondaryMuscles: [] },
    { name: 'Seated Dumbbell Press', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'] },

    // Chest
    { name: 'Barbell Bench Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'] },
    { name: 'Cable Crossover', primaryMuscle: 'Chest', secondaryMuscles: [] },
    { name: 'Decline Barbell Press', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps'] },
    { name: 'Decline Iso-lateral Chest Press', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps'] },
    { name: 'Dip', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'] },
    { name: 'Dumbbell Bench Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'] },
    { name: 'Dumbbell Fly', primaryMuscle: 'Chest', secondaryMuscles: [] },
    { name: 'Incline Barbell Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'] },
    { name: 'Incline Dumbbell Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'] },
    { name: 'Machine Chest Press', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'] },
    { name: 'Machine Fly', primaryMuscle: 'Chest', secondaryMuscles: [] },
    { name: 'Push-up', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders', 'Triceps'] },
    { name: 'Close-Grip Bench Press', primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Shoulders'] },
    { name: 'Close-grip Dumbbell Press', primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Shoulders'] },

    // Back
    { name: 'Back Extension', primaryMuscle: 'Back', secondaryMuscles: ['Glutes', 'Hamstrings'] },
    { name: 'Barbell Row', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
    { name: 'Chin-up', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
    { name: 'Dumbbell Row', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
    { name: 'Face Pull', primaryMuscle: 'Back', secondaryMuscles: ['Shoulders'] },
    { name: 'Lat Pulldown', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
    { name: 'Machine Row', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
    { name: 'Pull-up', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
    { name: 'Seated Cable Row', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
    { name: 'T-Bar Row', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
    { name: 'Deadlift (Conventional)', primaryMuscle: 'Back', secondaryMuscles: ['Glutes', 'Hamstrings', 'Quads'] },

    // Biceps
    { name: 'Barbell Curl', primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'] },
    { name: 'Cable Curl', primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'] },
    { name: 'Concentration Curl', primaryMuscle: 'Biceps', secondaryMuscles: [] },
    { name: 'Dumbbell Curl', primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'] },
    { name: 'Hammer Curl', primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'] },
    { name: 'Nippard Curl', primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'] },
    { name: 'Preacher Curl', primaryMuscle: 'Biceps', secondaryMuscles: [] },
    { name: 'Reverse Curl - Barbell', primaryMuscle: 'Forearms', secondaryMuscles: ['Biceps'] },

    // Triceps
    { name: 'Dumbbell Kickback', primaryMuscle: 'Triceps', secondaryMuscles: [] },
    { name: 'Overhead Triceps Extension (Cable)', primaryMuscle: 'Triceps', secondaryMuscles: [] },
    { name: 'Overhead Triceps Extension (Dumbbell)', primaryMuscle: 'Triceps', secondaryMuscles: [] },
    { name: 'Skull Crusher (Barbell)', primaryMuscle: 'Triceps', secondaryMuscles: [] },
    { name: 'Triceps Dip', primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Shoulders'] },
    { name: 'Triceps Pushdown (Cable)', primaryMuscle: 'Triceps', secondaryMuscles: [] },
    
    // Legs (Quads, Hamstrings, Glutes, Calves)
    { name: 'Barbell Back Squat', primaryMuscle: 'Quads', secondaryMuscles: ['Glutes', 'Hamstrings'] },
    { name: 'Bulgarian Split Squat', primaryMuscle: 'Quads', secondaryMuscles: ['Glutes'] },
    { name: 'Front Squat', primaryMuscle: 'Quads', secondaryMuscles: ['Glutes', 'Abs'] },
    { name: 'Goblet Squat', primaryMuscle: 'Quads', secondaryMuscles: ['Glutes'] },
    { name: 'Good Morning', primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes', 'Back'] },
    { name: 'Hip Thrust (Barbell)', primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'] },

    { name: 'Leg Extension', primaryMuscle: 'Quads', secondaryMuscles: [] },
    { name: 'Leg Press', primaryMuscle: 'Quads', secondaryMuscles: ['Glutes', 'Hamstrings'] },
    { name: 'Lunge (Barbell)', primaryMuscle: 'Quads', secondaryMuscles: ['Glutes'] },
    { name: 'Lunge (Dumbbell)', primaryMuscle: 'Quads', secondaryMuscles: ['Glutes'] },
    { name: 'Lying Leg Curl', primaryMuscle: 'Hamstrings', secondaryMuscles: [] },
    { name: 'Romanian Deadlift (Barbell)', primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes', 'Back'] },
    { name: 'Romanian Deadlift (Dumbbell)', primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes', 'Back'] },
    { name: 'Seated Leg Curl', primaryMuscle: 'Hamstrings', secondaryMuscles: [] },

    { name: 'Seated Calf Raise', primaryMuscle: 'Calves', secondaryMuscles: [] },
    { name: 'Standing Calf Raise', primaryMuscle: 'Calves', secondaryMuscles: [] },

    // Core & Other
    { name: 'Cable Crunch', primaryMuscle: 'Abs', secondaryMuscles: [] },
    { name: 'Crunch', primaryMuscle: 'Abs', secondaryMuscles: [] },
    { name: 'Leg Raise', primaryMuscle: 'Abs', secondaryMuscles: [] },
    { name: 'Plank', primaryMuscle: 'Abs', secondaryMuscles: [] },
    { name: 'Russian Twist', primaryMuscle: 'Abs', secondaryMuscles: [] },
    { name: 'Farmer Carries', primaryMuscle: 'Forearms', secondaryMuscles: ['Traps', 'Abs'] }
];