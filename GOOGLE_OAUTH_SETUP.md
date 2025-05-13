# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for your Krishna Attendance Tracker application.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a name for your project (e.g., "Krishna Attendance Tracker")
5. Click "Create"
6. Wait for the project to be created, then select it from the dropdown

## 2. Enable Required APIs

1. In the left sidebar, navigate to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - Google Sheets API
   - Google Drive API
   - Identity Services API

## 3. Configure OAuth Consent Screen

1. In the left sidebar, navigate to "APIs & Services" > "OAuth consent screen"
2. Select "External" as the user type (unless you have a Google Workspace organization)
3. Click "Create"
4. Fill in the required information:
   - App name: "Krishna Attendance Tracker"
   - User support email: Your email address
   - Developer contact information: Your email address
5. Click "Save and Continue"
6. Add the following scopes:
   - `https://www.googleapis.com/auth/spreadsheets` (Google Sheets API)
   - `https://www.googleapis.com/auth/userinfo.profile` (User profile info)
   - `https://www.googleapis.com/auth/userinfo.email` (User email)
7. Click "Save and Continue"
8. Add test users (including your own email)
9. Click "Save and Continue"
10. Review your settings and click "Back to Dashboard"

## 4. Create OAuth Client ID

1. In the left sidebar, navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Name: "Krishna Attendance Tracker Web Client"
5. Add the following Authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
6. Add the following Authorized redirect URIs:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   - `http://localhost:5173/`
   - `http://127.0.0.1:5173/`
7. Click "Create"
8. Note down the Client ID and Client Secret

## 5. Create API Key

1. In the left sidebar, navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Rename the API key to something like "Krishna Attendance Tracker API Key"
4. Click "Restrict Key" to set restrictions:
   - Under "Application restrictions", select "HTTP referrers (websites)"
   - Add `http://localhost:5173/*` and `http://127.0.0.1:5173/*` as referrers
   - Under "API restrictions", select "Restrict key" and choose "Google Sheets API"
5. Click "Save"

## 6. Update Your Application Code

1. Open `src/services/AuthService.js`
2. Update the CLIENT_ID with your new OAuth client ID:
   ```javascript
   this.CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
   ```
3. Update the API_KEY with your new API key:
   ```javascript
   this.API_KEY = 'YOUR_API_KEY_HERE';
   ```
4. Open `src/services/GoogleSheetsService.js`
5. Update the API_KEY with your new API key:
   ```javascript
   this.API_KEY = 'YOUR_API_KEY_HERE';
   ```

## 7. Test Authentication

1. Open the `simple-auth-test.html` file in your browser
2. Click the "Sign In" button
3. Follow the Google authentication flow
4. If successful, you should see your profile information

## 8. Troubleshooting

If you encounter issues:

1. **Check the browser console for errors**
   - Press F12 to open developer tools
   - Look for any error messages in the console

2. **Verify your credentials**
   - Double-check that you've copied the correct Client ID and API Key
   - Make sure you've added the correct origins and redirect URIs

3. **Check CORS settings**
   - If you see CORS errors, make sure your origins are correctly configured

4. **Check OAuth consent screen**
   - Make sure you've added your email as a test user
   - Verify that you've added all required scopes

5. **Try in incognito mode**
   - Sometimes browser extensions can interfere with OAuth
   - Try signing in using an incognito/private browsing window

6. **Check API enablement**
   - Make sure all required APIs are enabled in your Google Cloud project
