# Polymer Dryer — Material Drying Log

AM-Craft Ultem 9085 materiālu žāvēšanas žurnāls ar automātisku ierakstu sūtīšanu uz Google Sheets.

## Setup

### 1. Google Apps Script (backend)

1. Atver spreadsheet: [Polymer Dryer Log](https://docs.google.com/spreadsheets/d/1cvyaViIjIdWXkIlv0z7BkSLX1W-M_TJd/)
2. **Extensions → Apps Script**
3. Ielīmē `AppScript_PolymerDryer.gs` saturu Code.gs failā
4. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Nokopē Web App URL

### 2. GitHub Pages (frontend)

1. Failā `index.html` aizvieto `YOUR_WEB_APP_URL_HERE` ar savu Web App URL
2. Push uz GitHub
3. **Settings → Pages → Source: main branch**
4. Lapa būs pieejama: `https://<username>.github.io/<repo-name>/`

## Kā strādā

| Darbība | Rezultāts spreadsheet |
|---|---|
| **Installation** | Jauna rinda: A=Nr, B–I=dati, J–O=tukšs |
| **Removal** | Atrod rindu pēc Batch+Amount, aizpilda J–O |

Identifikators: **Batch/Serial Nr + Amount (cm³)**

## Faili

- `index.html` — forma (GitHub Pages)
- `AppScript_PolymerDryer.gs` — backend (Google Apps Script)
