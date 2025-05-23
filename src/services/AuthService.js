// This service handles Google OAuth2 authentication
class AuthService {
  constructor() {
    // Replace with your actual client ID from Google Cloud Console
    this.CLIENT_ID = '192289058482-mff9g02nleh6tnhvu0k43de96mvpcfbc.apps.googleusercontent.com';
    // API key (still needed for some operations)
    this.API_KEY = 'AIzaSyAAxHsGKMs7L4QHAPmMAa6kUgP0zPngCxg';

    // The scopes we need for Google Sheets
    this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

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

    // Track initialization state
    this.isInitializing = false;
    this.isInitialized = false;
    this.initError = null;

    // Check if we're running in a development environment
    this.isDevelopment = window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';

    console.log(`Running in ${this.isDevelopment ? 'development' : 'production'} mode`);
  }

  // Initialize the Google API client
  async init() {
    // Prevent multiple initializations
    if (this.isInitializing) {
      console.log('Already initializing, waiting...');
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.isInitialized) {
            clearInterval(checkInterval);
            resolve();
          } else if (this.initError) {
            clearInterval(checkInterval);
            reject(this.initError);
          }
        }, 100);
      });
    }

    if (this.isInitialized) {
      console.log('Already initialized');
      return Promise.resolve();
    }

    this.isInitializing = true;
    this.initError = null;

    return new Promise((resolve, reject) => {
      console.log('Initializing Google API client...');

      // Function to load the Google API client
      const loadGapiAndGsi = () => {
        // First, check if gapi is already available
        if (window.gapi) {
          console.log('GAPI already loaded, proceeding to load GSI...');
          loadGsi();
          return;
        }

        console.log('Loading GAPI script...');
        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.async = true;
        script1.defer = true;
        script1.crossOrigin = "anonymous"; // Add crossOrigin attribute
        script1.onerror = (error) => {
          console.error('Failed to load GAPI script:', error);
          this.isInitializing = false;
          this.initError = new Error('Failed to load Google API script');
          reject(this.initError);
        };
        script1.onload = () => {
          console.log('GAPI script loaded successfully');
          // Add a small delay to ensure the script is fully initialized
          setTimeout(() => {
            loadGsi();
          }, 500);
        };
        document.body.appendChild(script1);
      };

      // Function to load the Google Identity Services library
      const loadGsi = () => {
        // Check if google accounts is already available
        if (window.google && window.google.accounts) {
          console.log('GSI already loaded, proceeding to initialize client...');
          this.initGapiClient(resolve, reject);
          return;
        }

        console.log('Loading GSI script...');
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.async = true;
        script2.defer = true;
        script2.crossOrigin = "anonymous"; // Add crossOrigin attribute
        script2.onerror = (error) => {
          console.error('Failed to load GSI script:', error);
          this.isInitializing = false;
          this.initError = new Error('Failed to load Google Identity Services script');
          reject(this.initError);
        };
        script2.onload = () => {
          console.log('GSI script loaded successfully');
          // Add a small delay to ensure the script is fully initialized
          setTimeout(() => {
            this.initGapiClient(resolve, reject);
          }, 500);
        };
        document.body.appendChild(script2);
      };

      // Start the loading process
      loadGapiAndGsi();
    });
  }

  // Initialize the GAPI client
  async initGapiClient(resolve, reject) {
    try {
      console.log('Initializing GAPI client...');

      // Initialize the GAPI client
      await new Promise((res, rej) => {
        window.gapi.load('client', {
          callback: res,
          onerror: (error) => {
            console.error('Error loading GAPI client:', error);
            rej(new Error('Failed to load GAPI client'));
          },
          timeout: 10000, // 10 seconds timeout
          ontimeout: () => rej(new Error('Timeout loading GAPI client'))
        });
      });

      console.log('GAPI client loaded, initializing with API key...');

      try {
        // Initialize the client with API key but without discovery docs first
        await window.gapi.client.init({
          apiKey: this.API_KEY,
        });

        console.log('GAPI client initialized with API key');

        // Now try to load the discovery docs separately
        try {
          console.log('Loading discovery docs...');
          for (const doc of this.DISCOVERY_DOCS) {
            try {
              await window.gapi.client.load(doc);
              console.log(`Successfully loaded discovery doc: ${doc}`);
            } catch (docError) {
              console.warn(`Failed to load discovery doc ${doc}:`, docError);
              // Continue with other docs even if one fails
            }
          }
        } catch (discoveryError) {
          console.warn('Error loading discovery docs:', discoveryError);
          // Continue even if discovery docs fail to load
        }
      } catch (initError) {
        console.warn('Error initializing client with API key:', initError);
        // Continue without API key - we'll rely on OAuth token only
      }

      console.log('Loading Sheets API directly...');

      // Try to load the sheets API directly
      try {
        await window.gapi.client.load('sheets', 'v4');
        console.log('Sheets API loaded successfully');
      } catch (sheetsError) {
        console.warn('Error loading Sheets API:', sheetsError);
        console.log('Continuing without Sheets API discovery doc - will rely on OAuth token only');
        // Continue even if Sheets API fails to load - we'll use direct REST calls
      }

      // Make sure google.accounts is available
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        console.error('Google Identity Services not available, trying to reload scripts');

        // Try to reload the scripts
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        // Wait for script to load
        await new Promise((res) => {
          script.onload = res;
          script.onerror = () => {
            console.error('Failed to reload GSI script');
            res();
          };
          // Timeout after 5 seconds
          setTimeout(res, 5000);
        });

        // Check again
        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
          throw new Error('Google Identity Services still not available after reload');
        }
      }

      console.log('Initializing token client...');

      // Initialize the token client with retry logic
      try {
        console.log('Creating token client with client ID:', this.CLIENT_ID);
        console.log('Using scopes:', this.SCOPES);

        // Initialize the token client
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          prompt: 'consent', // Force consent screen to ensure fresh token
          callback: (tokenResponse) => {
            console.log('Token response received:', tokenResponse);
            this.handleTokenResponse(tokenResponse);
          },
          error_callback: (error) => {
            console.error('Token client error:', error);
            this.updateSignInStatus(false);

            // Handle specific CORS errors
            if (error && error.type === 'popup_closed') {
              console.log('User closed the popup window');
            } else if (error && error.type === 'popup_blocked') {
              alert('Popup was blocked. Please allow popups for this site and try again.');
            } else {
              alert('Authentication failed. Please try again.');
            }
          }
        });
      } catch (tokenInitError) {
        console.error('Error initializing token client:', tokenInitError);

        // Try one more time with a delay
        console.log('Retrying token client initialization after delay...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          callback: (tokenResponse) => {
            console.log('Token response received (retry)');
            this.handleTokenResponse(tokenResponse);
          },
          error_callback: (error) => {
            console.error('Token client error (retry):', error);
            this.updateSignInStatus(false);
          }
        });
      }

      console.log('Token client initialized successfully');

      // Check if we have a stored token
      const storedToken = localStorage.getItem('gapi_access_token');
      const storedExpiry = localStorage.getItem('gapi_token_expiry');

      if (storedToken && storedExpiry && new Date().getTime() < parseInt(storedExpiry)) {
        console.log('Found valid stored token, setting it...');
        // We have a valid token
        window.gapi.client.setToken({ access_token: storedToken });
        this.accessToken = storedToken;

        // Fetch user profile with the stored token
        await this.fetchUserProfile();
        this.updateSignInStatus(true);
      } else {
        console.log('No valid stored token found');
        // No valid token
        this.updateSignInStatus(false);
      }

      console.log('Auth initialization complete');
      this.isInitialized = true;
      this.isInitializing = false;
      resolve();
    } catch (error) {
      console.error('Error initializing Google API client:', error);
      this.isInitializing = false;
      this.isInitialized = false;
      this.initError = error;
      reject(error);
    }
  }

  // Handle token response
  handleTokenResponse(tokenResponse) {
    console.log('Token response received');

    // Check for errors in the token response
    if (tokenResponse && tokenResponse.error) {
      console.error('Token error:', tokenResponse.error);
      console.error('Error description:', tokenResponse.error_description || 'No description');

      // Handle specific error cases
      if (tokenResponse.error === 'invalid_grant' || tokenResponse.error === 'invalid_request') {
        console.error('Invalid credentials or request. Clearing stored tokens and retrying...');

        // Clear any stored tokens
        localStorage.removeItem('gapi_access_token');
        localStorage.removeItem('gapi_token_expiry');

        // Update sign-in status to false
        this.updateSignInStatus(false);

        // Show error to user
        alert(`Authentication error: ${tokenResponse.error_description || tokenResponse.error}. Please try again.`);
        return;
      }

      // For other errors, just update sign-in status
      this.updateSignInStatus(false);
      return;
    }

    // Process successful token response
    if (tokenResponse && tokenResponse.access_token) {
      console.log('Access token received successfully');
      this.accessToken = tokenResponse.access_token;

      // Store the token and expiry
      localStorage.setItem('gapi_access_token', tokenResponse.access_token);
      const expiryTime = new Date().getTime() + (tokenResponse.expires_in * 1000);
      localStorage.setItem('gapi_token_expiry', expiryTime.toString());

      // Set the token for API calls
      try {
        if (window.gapi && window.gapi.client) {
          window.gapi.client.setToken({ access_token: tokenResponse.access_token });
          console.log('Token set in GAPI client');
        } else {
          console.warn('GAPI client not available, token not set');
        }
      } catch (error) {
        console.error('Error setting token in GAPI client:', error);
        // Continue anyway as we have the token stored
      }

      // Fetch user profile
      this.fetchUserProfile().then(() => {
        console.log('User profile fetched, updating sign-in status');
        this.updateSignInStatus(true);
      }).catch(error => {
        console.error('Error fetching user profile:', error);
        // Still update sign-in status as we have a valid token
        this.updateSignInStatus(true);
      });
    } else {
      console.warn('No access token in response');
      this.updateSignInStatus(false);
    }
  }

  // Fetch user profile
  async fetchUserProfile() {
    try {
      if (!this.accessToken) {
        console.error('No access token available');
        return null;
      }

      console.log('Fetching user profile with token');
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        console.error('Profile fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
      console.log('User profile data:', data);
      this.currentUser = data;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      this.currentUser = null;
      return null;
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
    console.log('Starting sign-in process...');

    // Create a new promise for the sign-in process
    return new Promise((resolve, reject) => {
      try {
        // First, make sure the Google Identity Services library is loaded
        if (!window.google || !window.google.accounts) {
          console.log('Google Identity Services not loaded, loading now...');

          // Load the Google Identity Services library
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            console.log('Google Identity Services loaded, continuing sign-in...');
            this.continueSignIn(resolve, reject);
          };
          script.onerror = (error) => {
            console.error('Failed to load Google Identity Services:', error);
            reject(new Error('Failed to load Google Identity Services'));
          };
          document.body.appendChild(script);
        } else {
          // Google Identity Services is already loaded
          console.log('Google Identity Services already loaded, continuing sign-in...');
          this.continueSignIn(resolve, reject);
        }
      } catch (error) {
        console.error('Error in signIn:', error);
        reject(error);
      }
    });
  }

  // Continue the sign-in process after Google Identity Services is loaded
  continueSignIn(resolve, reject) {
    try {
      console.log('Initializing token client...');

      // Clear any previous tokens
      localStorage.removeItem('gapi_access_token');
      localStorage.removeItem('gapi_token_expiry');

      // Create a token client
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: (response) => {
          console.log('Token response received');

          if (response.error) {
            console.error('Error in token response:', response.error);
            reject(new Error(`Token error: ${response.error}`));
            return;
          }

          console.log('Access token received');
          this.accessToken = response.access_token;

          // Store the token and expiry
          localStorage.setItem('gapi_access_token', response.access_token);
          const expiryTime = new Date().getTime() + (response.expires_in * 1000);
          localStorage.setItem('gapi_token_expiry', expiryTime.toString());

          // Set the token for API calls if GAPI is available
          if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken({ access_token: response.access_token });
          }

          // Fetch user profile
          this.fetchUserProfile().then(() => {
            console.log('User profile fetched, updating sign-in status');
            this.updateSignInStatus(true);
            resolve(true);
          }).catch(error => {
            console.error('Error fetching user profile:', error);
            // Still consider sign-in successful even if profile fetch fails
            this.updateSignInStatus(true);
            resolve(true);
          });
        }
      });

      console.log('Requesting access token...');
      tokenClient.requestAccessToken({
        prompt: 'consent'
      });

      console.log('Access token request sent');
    } catch (error) {
      console.error('Error in continueSignIn:', error);
      reject(error);
    }
  }

  // Sign out the user
  signOut() {
    if (!this.isInitialized) {
      console.warn('Auth service not initialized, initializing now...');
      return this.init().then(() => this.signOut());
    }

    if (!this.tokenClient) {
      console.error('Token client not initialized');
      return Promise.reject(new Error('Token client not initialized'));
    }

    return new Promise((resolve) => {
      // Revoke the token
      if (this.accessToken) {
        console.log('Revoking access token...');
        window.google.accounts.oauth2.revoke(this.accessToken, () => {
          console.log('Token revoked successfully');
          this.updateSignInStatus(false);
          resolve();
        });
      } else {
        console.log('No access token to revoke');
        this.updateSignInStatus(false);
        resolve();
      }
    });
  }

  // Check if the user is signed in
  isUserSignedIn() {
    // Check if we have a stored token that's still valid
    const storedToken = localStorage.getItem('gapi_access_token');
    const storedExpiry = localStorage.getItem('gapi_token_expiry');

    if (storedToken && storedExpiry && new Date().getTime() < parseInt(storedExpiry)) {
      // We have a valid token in storage
      if (!this.isSignedIn) {
        console.log('Found valid token in storage but isSignedIn is false, updating state');
        this.accessToken = storedToken;
        this.isSignedIn = true;
      }
      return true;
    }

    // No valid token in storage
    if (this.isSignedIn && !this.accessToken) {
      console.log('isSignedIn is true but no access token, updating state');
      this.isSignedIn = false;
    }

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
    // Check if we're signed in
    if (!this.isUserSignedIn()) {
      return null;
    }

    // Check if we have a current user
    if (!this.currentUser) {
      console.log('User is signed in but no profile available');
      // Try to fetch the profile if we have a token but no profile
      if (this.accessToken) {
        console.log('Have token but no profile, fetching profile...');
        // Schedule a profile fetch but don't wait for it
        this.fetchUserProfile().catch(error => {
          console.error('Error fetching user profile in getUserProfile:', error);
        });
      }
      return null;
    }

    return this.currentUser;
  }
}

export default new AuthService();
