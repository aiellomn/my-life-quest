# Upload Instructions - Firebase Sync Version

Upload these to GitHub on the MAIN branch:

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

Netlify environment variable:
- GEMINI_API_KEY = your Gemini API key

After upload:
1. Commit changes.
2. Wait for Netlify deploy to publish.
3. Open the app.
4. Click "Sign in with Google."
5. Add or edit an item.
6. Click "Sync Now" or wait a second.
7. Open the app on another device and sign in with the same Google account.
