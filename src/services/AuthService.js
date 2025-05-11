import { gapi } from 'gapi-script';

// This service handles Google OAuth2 authentication
class AuthService {
  constructor() {
    // Replace with your actual client ID from Google Cloud Console
    this.CLIENT_ID = '192289058482-mff9g02nleh6tnhvu0k43de96mvpcfbc.apps.googleusercontent.com';
    // API key (still needed for some operations)
    this.API_KEY = 'AIzaSyAAxHsGKMs7L4QHAPmMAa6kUgP0zPngCxg';

    // The scopes we need for Google Sheets
    this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

    // Discovery docs for the API
    this.DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];

    // Whether the user is signed in
    this.isSignedIn = false;

    // The current user
    this.currentUser = null;

    // The current access token
    this.accessToken = null;

    // Callbacks for sign-in state changes
    this.signInChangeCallbacks = [];

    // Google Identity Services client
    this.tokenClient = null;
  }

  // Initialize the Google API client
  async init() {
    return new Promise((resolve, reject) => {
      console.log('Initializing Google API client...');

      // Load the Google API client library
      const script1 = document.createElement('script');
      script1.src = 'https://apis.google.com/js/api.js';
      script1.async = true;
      script1.defer = true;
      script1.onload = () => {
        // Load the Google Identity Services library
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.async = true;
        script2.defer = true;
        script2.onload = () => this.initGapiClient(resolve, reject);
        document.body.appendChild(script2);
      };
      document.body.appendChild(script1);
    });
  }

  // Initialize the GAPI client
  async initGapiClient(resolve, reject) {
    try {
      // Initialize the GAPI client
      await new Promise((res, rej) => {
        gapi.load('client', { callback: res, onerror: rej });
      });

      // Initialize the client
      await gapi.client.init({
        apiKey: this.API_KEY,
        discoveryDocs: this.DISCOVERY_DOCS,
      });

      // Load the sheets API
      await gapi.client.load('sheets', 'v4');
      console.log('Sheets API loaded successfully');

      // Initialize the token client
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: this.handleTokenResponse.bind(this),
        error_callback: (error) => {
          console.error('Token client error:', error);
          this.updateSignInStatus(false);
          reject(error);
        }
      });

      // Check if we have a stored token
      const storedToken = localStorage.getItem('gapi_access_token');
      const storedExpiry = localStorage.getItem('gapi_token_expiry');

      if (storedToken && storedExpiry && new Date().getTime() < parseInt(storedExpiry)) {
        // We have a valid token
        gapi.client.setToken({ access_token: storedToken });
        this.accessToken = storedToken;
        this.updateSignInStatus(true);
      } else {
        // No valid token
        this.updateSignInStatus(false);
      }

      console.log('Auth initialization complete');
      resolve();
    } catch (error) {
      console.error('Error initializing Google API client', error);
      reject(error);
    }
  }

  // Handle token response
  handleTokenResponse(tokenResponse) {
    console.log('Token response:', tokenResponse);

    if (tokenResponse && tokenResponse.access_token) {
      this.accessToken = tokenResponse.access_token;

      // Store the token and expiry
      localStorage.setItem('gapi_access_token', tokenResponse.access_token);
      const expiryTime = new Date().getTime() + (tokenResponse.expires_in * 1000);
      localStorage.setItem('gapi_token_expiry', expiryTime.toString());

      // Set the token for API calls
      gapi.client.setToken({ access_token: tokenResponse.access_token });

      // Fetch user profile
      this.fetchUserProfile().then(() => {
        this.updateSignInStatus(true);
      });
    } else {
      this.updateSignInStatus(false);
    }
  }

  // Fetch user profile
  async fetchUserProfile() {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        this.currentUser = {
          profile: {
            id: userInfo.sub,
            name: userInfo.name,
            email: userInfo.email,
            imageUrl: userInfo.picture
          }
        };
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  // Update sign-in status
  updateSignInStatus(isSignedIn) {
    this.isSignedIn = isSignedIn;

    if (!isSignedIn) {
      this.currentUser = null;
      this.accessToken = null;
      localStorage.removeItem('gapi_access_token');
      localStorage.removeItem('gapi_token_expiry');
      console.log('User is not signed in');
    } else {
      console.log('User is signed in, access token:', this.accessToken);
      console.log('User profile:', this.getUserProfile());
    }

    // Notify all callbacks
    this.signInChangeCallbacks.forEach(callback => callback(isSignedIn));
  }

  // Sign in the user
  signIn() {
    if (!this.tokenClient) {
      return Promise.reject(new Error('Token client not initialized'));
    }

    return new Promise((resolve, reject) => {
      try {
        // Request a token
        this.tokenClient.requestAccessToken({
          prompt: 'consent',
          hint: 'divya2000akula@gmail.com'
        });
        resolve();
      } catch (error) {
        console.error('Sign in error:', error);
        reject(error);
      }
    });
  }

  // Sign out the user
  signOut() {
    if (!this.tokenClient) {
      return Promise.reject(new Error('Token client not initialized'));
    }

    return new Promise((resolve) => {
      // Revoke the token
      if (this.accessToken) {
        google.accounts.oauth2.revoke(this.accessToken, () => {
          this.updateSignInStatus(false);
          resolve();
        });
      } else {
        this.updateSignInStatus(false);
        resolve();
      }
    });
  }

  // Check if the user is signed in
  isUserSignedIn() {
    return this.isSignedIn;
  }

  // Get the current access token
  getAccessToken() {
    return this.accessToken;
  }

  // Register a callback for sign-in state changes
  onSignInChanged(callback) {
    this.signInChangeCallbacks.push(callback);

    // Call the callback with the current state
    if (this.isSignedIn !== null) {
      callback(this.isSignedIn);
    }

    return () => {
      // Remove the callback when no longer needed
      this.signInChangeCallbacks = this.signInChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  // Get user profile information
  getUserProfile() {
    if (!this.isSignedIn || !this.currentUser) {
      return null;
    }

    return this.currentUser.profile;
  }
}

export default new AuthService();
