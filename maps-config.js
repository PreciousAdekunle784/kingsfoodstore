/* Kings Food Mart — Google Maps key for the delivery address picker.
   ────────────────────────────────────────────────────────────
   SETUP: paste your Google Maps JavaScript API key below.
   In Google Cloud Console (same project as your sign-in works fine):
     1. APIs & Services → Library → enable "Maps JavaScript API"
        AND "Places API" (and "Geocoding API" for the drag-to-pin).
     2. APIs & Services → Credentials → Create credentials → API key.
     3. Restrict the key: Application restrictions → Websites →
        add https://kingsfoodmart.ng/* (and your localhost while testing).
        API restrictions → limit to the three APIs above.
     4. Enable billing on the project (Google gives a large free monthly
        allowance; a small store normally stays within it).

   The key is safe in the browser AS LONG AS you add the website
   restriction in step 3 — that stops anyone else using your key.
   If this is left as the placeholder, checkout falls back to a plain
   typed address box (no map). */

const GOOGLE_MAPS_API_KEY = "PASTE_YOUR_GOOGLE_MAPS_API_KEY";

window.GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY;
window.MAPS_READY = !!GOOGLE_MAPS_API_KEY && !GOOGLE_MAPS_API_KEY.includes("PASTE_YOUR");
