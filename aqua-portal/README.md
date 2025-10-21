Aqua Portal - starter repo
==========================

How to run locally:

1. Install Node.js and npm.
2. Open a terminal in this folder (where package.json is).
3. Run: npm install
4. Optionally run: sqlite3 aqua.db < db-init.sql
   (server will auto-create tables if not present)
5. Start server: npm start
6. Visit http://localhost:3000 in your browser.

Notes:
- Default session store uses SQLite. Change 'secret' in server.js for production.
- Species "identification" is manual: upload an image and choose matching species from the list.
- Images are simple SVG placeholders — replace with real photos in public/images.
