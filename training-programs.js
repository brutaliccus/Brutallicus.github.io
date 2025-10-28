const TRAINING_PROGRAMS = [
    {
        id: 'stronglifts-5x5',
        name: 'StrongLifts 5x5',
        description: 'A beginner strength program based on linear progression. You perform two alternating, full-body workouts three times a week, focusing on adding weight to the bar every session.',
        frequency: '3 days per week (e.g., Mon/Wed/Fri)',
        workouts: [
            {
                name: 'Workout A',
                exercises: [
                    { name: 'Squat', sets_reps: '5x5' },
                    { name: 'Bench Press', sets_reps: '5x5' },
                    { name: 'Barbell Row', sets_reps: '5x5' },
                ]
            },
            {
                name: 'Workout B',
                exercises: [
                    { name: 'Squat', sets_reps: '5x5' },
                    { name: 'Overhead Press', sets_reps: '5x5' },
                    { name: 'Deadlift', sets_reps: '1x5' },
                ]
            }
        ],
        notes: `
            <h4>Progression:</h4>
            <p>Start with a light weight and add 5 lbs (2.5 kg) to each exercise every time you perform it, except for Deadlift where you add 10 lbs (5 kg).</p>
            <h4>Deloading:</h4>
            <p>If you fail to complete all 5x5 reps for an exercise three times in a row, deload by 10% and continue progressing from there.</p>
        `
    },
    {
        id: 'starting-strength',
        name: 'Starting Strength',
        description: 'Mark Rippetoe\'s foundational program for novices, focusing on linear progression with five fundamental barbell exercises to build a base of strength.',
        frequency: '3 days per week (e.g., Mon/Wed/Fri, alternating A and B)',
        workouts: [
            {
                name: 'Workout A',
                exercises: [
                    { name: 'Squat', sets_reps: '3x5' },
                    { name: 'Bench Press', sets_reps: '3x5' },
                    { name: 'Deadlift', sets_reps: '1x5' },
                ]
            },
            {
                name: 'Workout B',
                exercises: [
                    { name: 'Squat', sets_reps: '3x5' },
                    { name: 'Overhead Press', sets_reps: '3x5' },
                    { name: 'Power Clean', sets_reps: '5x3' },
                ]
            }
        ],
        notes: `
            <h4>Progression:</h4>
            <p>This program emphasizes making consistent, small jumps in weight each workout to drive adaptation. The goal is to add weight to the bar for as long as possible.</p>
            <h4>Key Lifts:</h4>
            <p>The program is built around mastering the technique of the core lifts. The Power Clean is introduced as a key explosive movement.</p>
        `
    },
    {
        id: 'greyskull-lp',
        name: 'Greyskull LP',
        description: 'A beginner linear progression program with a focus on intensity and autoregulation through the use of an AMRAP (As Many Reps As Possible) set as the final set for main lifts.',
        frequency: '3 days per week (e.g., Mon/Wed/Fri, alternating A and B)',
        workouts: [
            {
                name: 'Workout A',
                exercises: [
                    { name: 'Overhead Press / Bench Press (alternate)', sets_reps: '2x5, 1x5+' },
                    { name: 'Squat', sets_reps: '2x5, 1x5+' },
                    { name: 'Barbell Row', sets_reps: '2x6-8' },
                ]
            },
            {
                name: 'Workout B',
                exercises: [
                    { name: 'Bench Press / Overhead Press (alternate)', sets_reps: '2x5, 1x5+' },
                    { name: 'Deadlift', sets_reps: '1x5+' },
                    { name: 'Chin-up', sets_reps: '2x to failure' },
                ]
            }
        ],
        notes: `
            <h4>AMRAP Sets (1x5+):</h4>
            <p>The final set of your main lifts is an AMRAP ("As Many Reps As Possible") set. Aim for more than 5 reps. Your performance on this set determines your weight increase for the next session.</p>
            <ul>
                <li><strong>5-9 reps:</strong> Increase weight by 5 lbs (2.5 kg) next time.</li>
                <li><strong>10+ reps:</strong> Increase weight by 10 lbs (5 kg) next time.</li>
            </ul>
            <h4>Alternating Lifts:</h4>
            <p>Each week, you alternate which main upper body lift you do first. For example, Monday: OHP, Wednesday: Bench, Friday: OHP. The next week would be Bench, OHP, Bench.</p>
        `
    },
    {
        id: '531-for-beginners',
        name: '5/3/1 for Beginners',
        description: 'A simplified version of Jim Wendler\'s 5/3/1 principles. It focuses on slow, steady, sub-maximal progression on two main lifts per day, combined with assistance work.',
        frequency: '3 days per week (e.g., Mon/Wed/Fri)',
        workouts: [
            {
                name: 'Day A',
                exercises: [
                    { name: 'Squat', sets_reps: '5/3/1 Progression' },
                    { name: 'Bench Press', sets_reps: '5/3/1 Progression' },
                    { name: 'Assistance Work', sets_reps: '5x10' },
                ]
            },
            {
                name: 'Day B',
                exercises: [
                    { name: 'Deadlift', sets_reps: '5/3/1 Progression' },
                    { name: 'Overhead Press', sets_reps: '5/3/1 Progression' },
                    { name: 'Assistance Work', sets_reps: '5x10' },
                ]
            }
        ],
        notes: `
            <h4>5/3/1 Progression Explained:</h4>
            <p>This program works in cycles, typically 3-4 weeks. You calculate your lifts based on 90% of your one-rep max (your "Training Max" or TM).</p>
            <ul>
                <li><strong>Week 1:</strong> 3 sets of 5 reps (e.g., 65% x 5, 75% x 5, 85% x 5+)</li>
                <li><strong>Week 2:</strong> 3 sets of 3 reps (e.g., 70% x 3, 80% x 3, 90% x 3+)</li>
                <li><strong>Week 3:</strong> 1x5, 1x3, 1x1 (e.g., 75% x 5, 85% x 3, 95% x 1+)</li>
            </ul>
            <p>The final set of each main lift is an AMRAP ("As Many Reps As Possible") set, noted by the "+".</p>
            <h4>Assistance Work:</h4>
            <p>Choose 1-2 exercises from categories like Push, Pull, or Legs/Core and perform 50-100 total reps. Examples: Dumbbell Rows, Dips, Leg Press, Ab work.</p>
        `
    },
    {
        id: 'upper-lower-split',
        name: 'Upper/Lower Split',
        description: 'A popular 4-day split that divides training between upper body days and lower body days. This allows for more volume and focus per muscle group than full-body routines, making it ideal for intermediate lifters.',
        frequency: '4 days per week (e.g., Mon: Upper, Tue: Lower, Thu: Upper, Fri: Lower)',
        workouts: [
            {
                name: 'Upper Body',
                exercises: [
                    { name: 'Bench Press', sets_reps: '3x5-8' },
                    { name: 'Barbell Row', sets_reps: '3x5-8' },
                    { name: 'Incline Dumbbell Press', sets_reps: '3x8-12' },
                    { name: 'Lat Pulldown', sets_reps: '3x8-12' },
                    { name: 'Dumbbell Lateral Raise', sets_reps: '3x12-15' },
                    { name: 'Triceps Pushdown', sets_reps: '3x10-15' },
                    { name: 'Barbell Curl', sets_reps: '3x10-15' },
                ]
            },
            {
                name: 'Lower Body',
                exercises: [
                    { name: 'Squat', sets_reps: '3x5-8' },
                    { name: 'Romanian Deadlift', sets_reps: '3x8-12' },
                    { name: 'Leg Press', sets_reps: '3x10-15' },
                    { name: 'Lying Leg Curl', sets_reps: '3x10-15' },
                    { name: 'Calf Raise', sets_reps: '4x10-15' },
                ]
            }
        ],
        notes: `
            <h4>Progression:</h4>
            <p>Focus on adding weight or reps over time. For the lower rep ranges (5-8), prioritize adding weight. For the higher rep ranges (8-15), prioritize completing all reps cleanly before increasing the weight.</p>
        `
    },
    {
        id: 'push-pull-legs',
        name: 'Push / Pull / Legs (PPL)',
        description: 'A classic workout split for intermediate lifters. The routine cycles through a "Push" day (chest, shoulders, triceps), a "Pull" day (back, biceps), and a "Legs" day. This example is a 6-day/week routine.',
        frequency: '6 days per week (e.g., Push, Pull, Legs, Rest, Push, Pull, Legs)',
        workouts: [
            {
                name: 'Push Day',
                exercises: [
                    { name: 'Bench Press', sets_reps: '3x5' },
                    { name: 'Overhead Press', sets_reps: '3x8-12' },
                    { name: 'Incline Dumbbell Press', sets_reps: '3x8-12' },
                    { name: 'Triceps Pushdown', sets_reps: '3x10-15' },
                    { name: 'Dumbbell Lateral Raise', sets_reps: '3x10-15' },
                ]
            },
            {
                name: 'Pull Day',
                exercises: [
                    { name: 'Deadlift', sets_reps: '1x5' },
                    { name: 'Pull-up', sets_reps: '3x to failure' },
                    { name: 'Barbell Row', sets_reps: '3x8-12' },
                    { name: 'Face Pull', sets_reps: '3x12-15' },
                    { name: 'Barbell Curl', sets_reps: '3x8-12' },
                ]
            },
            {
                name: 'Leg Day',
                exercises: [
                    { name: 'Squat', sets_reps: '3x5' },
                    { name: 'Romanian Deadlift', sets_reps: '3x8-12' },
                    { name: 'Leg Press', sets_reps: '3x10-15' },
                    { name: 'Leg Curl', sets_reps: '3x10-15' },
                    { name: 'Calf Raise', sets_reps: '4x10-15' },
                ]
            }
        ],
        notes: `
            <h4>Progression:</h4>
            <p>Focus on progressive overload. For compound lifts (3x5), aim to add a small amount of weight each week. For accessory lifts (higher rep ranges), aim to increase reps first, then increase weight once you can complete all sets at the top of the rep range.</p>
        `
    }
];