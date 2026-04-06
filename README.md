# Clinical Trial Patient Management System (CTPMS)

CTPMS is now a React + Tailwind frontend backed by an Express + SQLite API.

## Stack

- React 18
- Tailwind CSS
- Vite 5
- Express 5
- SQLite3

## Scripts

- `npm run dev`: runs Express API and Vite dev server together
- `npm run dev:server`: runs only the API server on port 3000
- `npm run dev:client`: runs only the React app on port 5173
- `npm run build`: builds the React app to `dist/`
- `npm start`: runs Express server (serves API and `dist/` if built)

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open `http://localhost:5173`.

## Production-style Run

```bash
npm run build
npm start
```

Open `http://localhost:3000`.

## API

### `GET /patients`

Returns all patient records in reverse chronological order.

### `POST /patients`

Creates a new patient record.

Request body:

```json
{
	"fullName": "Jane Doe",
	"dob": "1990-01-01",
	"gender": "female",
	"trialCode": "CT-ONC-204",
	"condition": "Metastatic breast cancer",
	"phone": "+1 555 123 4567",
	"notes": "Eligible, consented"
}
```

Required fields:

- `fullName`
- `dob`
- `gender`
- `trialCode`
- `condition`

Optional fields:

- `phone`
- `notes`

The server computes `enrollment_status` automatically:

- `hold`: notes contain hold signals like `on hold`, `pending`, `missing`, `incomplete`
- `enrolled`: notes contain terms like `enrolled`, `consented`, `randomized`
- `eligible`: notes contain eligibility signals or a phone number is present
- `screening`: default fallback

## Data Storage

- SQLite DB file: `chinook.db`
- Table: `trial_patients`

Table columns:

- `id`
- `full_name`
- `dob`
- `gender`
- `trial_code`
- `primary_condition`
- `enrollment_status`
- `phone`
- `notes`
- `created_at`
