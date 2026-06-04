# Upload Instructions - Dashboard Upgrade

This update adds to the Today dashboard:

- Today's Top 3
- Active Projects
- Next Actions
- Weekly Progress
- Streak
- Quest Points

Upload/replace the full project on GitHub MAIN branch:

- public/
- netlify/
- README.md
- UPLOAD_INSTRUCTIONS.md
- netlify.toml
- package.json

Netlify settings:
- Base directory: blank
- Build command: echo No build needed
- Publish directory: public
- Functions directory: netlify/functions

Keep your existing Netlify environment variable:
- GEMINI_API_KEY

After uploading, wait for Netlify to deploy, then refresh the app.
