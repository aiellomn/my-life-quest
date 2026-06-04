# My Life Quest - Netlify + Gemini AI Version

This is a Netlify-ready version of **My Life Quest**, an ADHD-friendly habit, task, routine, project, goal, reward, and progress tracker with Gemini-powered AI agents.

## What is included

- Static PWA app files in `/public`
- Netlify serverless function in `/netlify/functions/ai-agent.js`
- Gemini API key stays private in Netlify Environment Variables
- AI buttons only run when you tap them, so credits are not wasted

## AI Agents Included

- Project Breaker
- Goal Breaker
- Task Breaker
- Daily Planner
- Routine Suggester
- Weekly Insights
- Reflection Coach
- Affirmation Agent

## Setup on Netlify

1. Unzip this folder.
2. Go to Netlify.
3. Click **Add new site**.
4. Choose **Deploy manually**.
5. Drag this whole folder into Netlify.
6. Open your new site.
7. Go to **Site configuration → Environment variables**.
8. Add this variable:

```text
GEMINI_API_KEY
```

9. Paste your Gemini API key as the value.
10. Save.
11. Go to **Deploys → Trigger deploy → Deploy site**.
12. Open your app link.

## Add to Android home screen

1. Open the Netlify app link in Chrome on Android.
2. Tap the three dots.
3. Tap **Add to Home screen**.

## Important

Do not paste your Gemini key into `app.js`, `index.html`, or any public file.

The app saves your tasks/routines/projects/goals locally in your browser using localStorage. If you clear browser data, it can be deleted. Firebase login/sync can be added later.


## Firebase Cloud Sync Version

This version adds:
- Google Sign-In
- Firestore cloud sync
- Local storage fallback
- Sync Now button
- User data stored at users/{uid}/appData/main

Firebase setup required:
- Authentication > Google enabled
- Firestore Database created


## Dashboard Upgrade

Adds Today's Top 3, Active Projects, Next Actions, Weekly Progress, Streak, and Quest Points to the Today dashboard.


## Collapsible Upgrade

Tasks, routines, projects, and goals are now collapsed by default. Tap the caret/title to expand. Expand All and Collapse All controls were added.


## Pomodoro + Checkable Subtasks Upgrade

Pomodoro now suggests tasks and asks what was completed at the end. Subtasks are checkboxes and award partial credit.
