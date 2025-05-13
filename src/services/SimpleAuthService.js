// A simplified Google OAuth authentication service
class SimpleAuthService {
  constructor() {
    // Your OAuth client ID - replace with your actual client ID
    this.CLIENT_ID = '192289058482-mff9g02nleh6tnhvu0k43de96mvpcfbc.apps.googleusercontent.com';
    
    // The scopes we need
    this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
    
    // Authentication state
    this.isSignedIn = false;
    this.accessToken = null;
    this.userProfile = null;
    
    // Callbacks for sign-in state changes
    this.signInChangeCallbacks = [];
    
    // Check if we have a stored token
    this.checkStoredToken();
  }
  
  // Check if we have a stored token
  checkStoredToken() {
    const storedToken = localStorage.getItem('simple_auth_token');
    const storedExpiry = localStorage.getItem('simple_auth_expiry');
    
    if (storedToken && storedExpiry && new Date().getTime() < parseInt(storedExpiry)) {
      console.log('Found valid stored token');
      this.accessToken = storedToken;
      this.isSignedIn = true;
      
      // Try to fetch the user profile
      this.fetchUserProfile().catch(error => {
        console.error('Error fetching user profile from stored token:', error);
      });
    } else {
      console.log('No valid stored token found');
      this.isSignedIn = false;
      this.accessToken = null;
      this.userProfile = null;
    }
  }
  
  // Load the Google Identity Services library
  async loadGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts) {
        console.log('Google Identity Services already loaded');
        resolve();
        return;
      }
      
      console.log('Loading Google Identity Services...');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('Google Identity Services loaded');
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google Identity Services:', error);
        reject(new Error('Failed to load Google Identity Services'));
      };
      
      document.body.appendChild(script);
    });
  }
  
  // Sign in with Google
  async signIn() {
    try {
      // Load Google Identity Services if not already loaded
      await this.loadGoogleIdentityServices();
      
      return new Promise((resolve, reject) => {
        console.log('Initializing token client...');
        
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          callback: (response) => {
            if (response.error) {
              console.error('Error in token response:', response.error);
              this.updateSignInStatus(false);
              reject(new Error(`Token error: ${response.error}`));
              return;
            }
            
            console.log('Access token received');
            this.accessToken = response.access_token;
            
            // Store the token and expiry
            localStorage.setItem('simple_auth_token', response.access_token);
            const expiryTime = new Date().getTime() + (response.expires_in * 1000);
            localStorage.setItem('simple_auth_expiry', expiryTime.toString());
            
            // Fetch user profile
            this.fetchUserProfile()
              .then(() => {
                this.updateSignInStatus(true);
                resolve(true);
              })
              .catch(error => {
                console.error('Error fetching user profile:', error);
                this.updateSignInStatus(true);
                resolve(true);
              });
          }
        });
        
        console.log('Requesting access token...');
        tokenClient.requestAccessToken({
          prompt: 'consent'
        });
      });
    } catch (error) {
      console.error('Error in signIn:', error);
      this.updateSignInStatus(false);
      throw error;
    }
  }
  
  // Sign out
  async signOut() {
    try {
      // Load Google Identity Services if not already loaded
      await this.loadGoogleIdentityServices();
      
      return new Promise((resolve) => {
        if (this.accessToken) {
          console.log('Revoking access token...');
          window.google.accounts.oauth2.revoke(this.accessToken, () => {
            console.log('Token revoked');
            
            // Clear stored token
            localStorage.removeItem('simple_auth_token');
            localStorage.removeItem('simple_auth_expiry');
            
            this.accessToken = null;
            this.userProfile = null;
            this.updateSignInStatus(false);
            
            resolve(true);
          });
        } else {
          console.log('No access token to revoke');
          this.updateSignInStatus(false);
          resolve(true);
        }
      });
    } catch (error) {
      console.error('Error in signOut:', error);
      throw error;
    }
  }
  
  // Fetch user profile
  async fetchUserProfile() {
    if (!this.accessToken) {
      console.error('No access token available');
      return null;
    }
    
    try {
      console.log('Fetching user profile...');
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      console.log('User profile fetched:', data);
      this.userProfile = data;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
  
  // Update sign-in status and notify callbacks
  updateSignInStatus(isSignedIn) {
    this.isSignedIn = isSignedIn;
    console.log(`Sign-in status updated: ${isSignedIn}`);
    
    // Notify all callbacks
    this.signInChangeCallbacks.forEach(callback => {
      try {
        callback(isSignedIn);
      } catch (error) {
        console.error('Error in sign-in change callback:', error);
      }
    });
  }
  
  // Register a callback for sign-in state changes
  onSignInChanged(callback) {
    this.signInChangeCallbacks.push(callback);
    
    // Call the callback with the current state
    callback(this.isSignedIn);
    
    // Return a function to unregister the callback
    return () => {
      this.signInChangeCallbacks = this.signInChangeCallbacks.filter(cb => cb !== callback);
    };
  }
  
  // Check if the user is signed in
  isUserSignedIn() {
    return this.isSignedIn;
  }
  
  // Get the current access token
  getAccessToken() {
    return this.accessToken;
  }
  
  // Get user profile information
  getUserProfile() {
    return this.userProfile;
  }
}

export default new SimpleAuthService();
