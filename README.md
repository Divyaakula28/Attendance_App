# Krishna Attendance Tracker

A React application for tracking and managing ISKCON student attendance using Google Sheets as a backend.

## Features

- Google Sheets integration for storing attendance data
- Google OAuth authentication for secure access
- Record attendance for students by date
- View and filter attendance records
- Add, update, and delete student information
- Responsive design for mobile and desktop
- Krishna-themed UI elements

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up Google Sheets API:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Sheets API
   - Create API credentials (API Key)
   - Copy your API Key

4. Configure the application:
   - Open `src/services/GoogleSheetsService.js`
   - Add your Google API Key to the `API_KEY` field
   - Add your Google Spreadsheet ID to the `SPREADSHEET_ID` field

   The Spreadsheet ID is the part of your Google Sheets URL between `/d/` and `/edit`. For example, in the URL `https://docs.google.com/spreadsheets/d/1ABC123XYZ/edit`, the Spreadsheet ID is `1ABC123XYZ`.

5. Make sure your Google Sheet has appropriate permissions:
   - The sheet should be publicly accessible for reading (for the view functionality)
   - For the write functionality, you'll need to set up proper authentication (the current implementation is simplified)

## Running the Application

Start the development server:

```
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173).

## Building for Production

To create a production build:

```
npm run build
```

The build files will be in the `dist` directory.

## Technologies Used

- React
- Vite
- Google Sheets API
- Google OAuth 2.0
- FontAwesome icons
- CSS3 with responsive design
- Recharts for analytics

## Notes on Google Sheets API

This application uses Google OAuth2 for authentication with the Google Sheets API, providing:

1. Secure access to Google Sheets data
2. User-specific permissions
3. Robust error handling
4. Real-time data synchronization

