# Upload Instructions

1. Unzip the ZIP file.
2. Open the extracted folder.
3. Upload everything inside that folder to the root of your GitHub repo.
4. Confirm GitHub shows these at the top level:
   - index.html
   - app.js
   - styles.css
   - manifest.json
   - icon.svg
   - netlify.toml
   - package.json
   - netlify/functions/ai-agent.js
5. In Netlify, use:
   - Publish directory: .
   - Functions directory: netlify/functions
   - Build command: echo No build needed
6. Trigger a new deploy.
7. Open the deploy preview and verify the bottom app pages are still visible.

After deploy, open the Customize page to adjust dashboard order, page order, and list ordering.
