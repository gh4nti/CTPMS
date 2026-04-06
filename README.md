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
	"gender": "Female",
	"phone": "+1 555 123 4567",
	"email": "jane.doe@example.com",
	"heightCm": 170,
	"weightKg": 65,
	"bloodGroup": "A+"
}
```

Required fields:

- `fullName`
- `dob`
- `gender`
- `phone`
- `email`
- `heightCm`
- `weightKg`
- `bloodGroup`

Gender values accepted by the DB are `Male`, `Female`, `Other`, and `Unknown`.

## Data Storage

- SQLite DB file: `clinical_trials.db`
- Main write table: `patients`
- Read model joins `patients`, `patient_trial_matches`, `enrollment`, `diagnoses`, `diseases`, and `clinical_trials`

Inserted patient columns:

- `patient_id`
- `name`
- `date_of_birth`
- `gender`
- `phone`
- `email`
- `height_cm`
- `weight_kg`
- `blood_group`
- `created_at`
