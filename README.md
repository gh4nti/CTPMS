# Clinical Trial Patient Management System (CTPMS)

CTPMS stands for Clinical Trial Patient Management System. It is a small clinical trial patient management app built with Express, SQLite, and a static browser UI. It lets staff create patient intake records and view the current list of enrolled or screening patients.

## Features

- Patient intake form in the browser
- Persistent storage in SQLite
- Live patient list loaded from the server
- Minimal JSON API for creating and reading records

## Tech Stack

- Node.js
- Express 5
- SQLite3
- Plain HTML, CSS, and JavaScript

## Project Structure

- `server.js` - Express server and SQLite database setup
- `public/index.html` - App shell and patient intake form
- `public/script.js` - Frontend data loading and form submission logic
- `public/style.css` - Visual styling for the dashboard
- `package.json` - Project metadata and dependencies

## Prerequisites

- Node.js 18 or newer
- npm

## Installation

Install dependencies from the project root:

```bash
npm install
```

## Run the App

Start the server:

```bash
node server.js
```

Then open:

```text
http://localhost:3000
```

The first run creates a local SQLite database file named `chinook.db` in the project root. The server also creates the `trial_patients` table automatically if it does not already exist.

## API

### `GET /patients`

Returns all patient records in reverse chronological order.

Example response:

```json
[
	{
		"id": 1,
		"full_name": "Jane Doe",
		"dob": "1990-01-01",
		"gender": "female",
		"trial_code": "CT-ONC-204",
		"patient_condition": "Metastatic breast cancer",
		"enrollment_status": "screening",
		"phone": "+1 555 123 4567",
		"notes": "Initial review complete",
		"created_at": "2026-04-06 12:34:56"
	}
]
```

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
	"status": "screening",
	"phone": "+1 555 123 4567",
	"notes": "Initial review complete"
}
```

Required fields:

- `fullName`
- `dob`
- `gender`
- `trialCode`
- `condition`
- `status`

Optional fields:

- `phone`
- `notes`

## Data Model

Records are stored in the `trial_patients` table with these fields:

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

## Notes

- The frontend loads existing patients on page load.
- Form submissions are sent as JSON to the Express API.
- The app uses static files from the `public` folder, so no build step is required.
