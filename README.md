# My Life Quest - App Layout + Productivity Engine

This is the restored app-style version of **My Life Quest** based on the Pomodoro/Subtasks build, with the requested upgrades added without removing the individual app pages.

## Included files

- `index.html`
- `app.js`
- `styles.css`
- `manifest.json`
- `icon.svg`
- `netlify.toml`
- `package.json`
- `netlify/functions/ai-agent.js`
- `UPLOAD_INSTRUCTIONS.md`

## Features included

- Bottom app navigation pages: Today, Tasks, Routines, Projects, Goals, Rewards, Progress, Customize
- Smart Pomodoro task picker
- Pomodoro completion check-in
- Checkable subtasks
- Partial credit from subtasks
- Dashboard widgets: Today's Top 3, Active Projects, Next Actions, Weekly Progress, Pomodoro, Mood/Energy, Routines
- AI Plan My Day
- AI What Should I Do Next?
- AI project, goal, task, routine, weekly review, reflection, and affirmation helpers
- Collapsible tasks, routines, projects, and goals
- Custom dashboard widget order
- Custom bottom page/tab order
- Custom list ordering for tasks, routines, projects, goals, and rewards
- Google/Firebase sync support from the previous build

## Netlify settings

Use these settings:

- Publish directory: `.`
- Functions directory: `netlify/functions`
- Build command: `echo No build needed`

## Gemini API key

To use the AI buttons, add this Netlify Environment Variable:

```text
GEMINI_API_KEY
```

Do not paste your Gemini key into public files like `app.js`, `index.html`, or `styles.css`.

## Upload instructions

Unzip this folder and upload all files and folders inside it to the root of your GitHub repository. Your GitHub root should show `index.html`, `app.js`, `styles.css`, `netlify.toml`, and the `netlify` folder.
