// A Google OAuth authentication service that uses a popup window approach
class PopupAuthService {
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
    const storedToken = localStorage.getItem('popup_auth_token');
    const storedExpiry = localStorage.getItem('popup_auth_expiry');
    const storedProfile = localStorage.getItem('popup_auth_profile');
    
    if (storedToken && storedExpiry && new Date().getTime() < parseInt(storedExpiry)) {
      console.log('Found valid stored token');
      this.accessToken = storedToken;
      this.isSignedIn = true;
      
      if (storedProfile) {
        try {
          this.userProfile = JSON.parse(storedProfile);
          console.log('Loaded user profile from storage:', this.userProfile);
        } catch (error) {
          console.error('Error parsing stored profile:', error);
          this.userProfile = null;
        }
      }
      
      // If we have a token but no profile, try to fetch it
      if (!this.userProfile && this.accessToken) {
        this.fetchUserProfile().catch(error => {
          console.error('Error fetching user profile from stored token:', error);
        });
      }
    } else {
      console.log('No valid stored token found');
      this.isSignedIn = false;
      this.accessToken = null;
      this.userProfile = null;
      
      // Clear any expired tokens
      if (storedToken || storedExpiry || storedProfile) {
        localStorage.removeItem('popup_auth_token');
        localStorage.removeItem('popup_auth_expiry');
        localStorage.removeItem('popup_auth_profile');
      }
    }
  }
  
  // Sign in with Google using a popup window
  signIn() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting sign-in process with popup...');
        
        // Create the OAuth URL
        const redirectUri = encodeURIComponent(window.location.origin + '/oauth-callback.html');
        const scope = encodeURIComponent(this.SCOPES);
        const responseType = 'token';
        const prompt = 'consent';
        
        const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${this.CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&prompt=${prompt}`;
        
        // Open the popup window
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          authUrl,
          'googleAuthPopup',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!popup) {
          throw new Error('Popup blocked! Please allow popups for this site and try again.');
        }
        
        // Poll the popup for the redirect
        const pollTimer = setInterval(() => {
          try {
            // Check if popup is closed
            if (popup.closed) {
              clearInterval(pollTimer);
              reject(new Error('Authentication cancelled by user'));
              return;
            }
            
            // Check if we're redirected to the callback page
            if (popup.location.href.includes('oauth-callback.html') || popup.location.href.includes('access_token=')) {
              clearInterval(pollTimer);
              
              // Extract the token from the URL
              const url = popup.location.href;
              const hashParams = new URLSearchParams(url.substring(url.indexOf('#') + 1));
              
              const accessToken = hashParams.get('access_token');
              const expiresIn = hashParams.get('expires_in');
              
              if (accessToken) {
                console.log('Access token received from popup');
                this.accessToken = accessToken;
                
                // Store the token and expiry
                const expiryTime = new Date().getTime() + (parseInt(expiresIn) * 1000);
                localStorage.setItem('popup_auth_token', accessToken);
                localStorage.setItem('popup_auth_expiry', expiryTime.toString());
                
                // Fetch user profile
                this.fetchUserProfile()
                  .then(() => {
                    popup.close();
                    this.updateSignInStatus(true);
                    resolve(true);
                  })
                  .catch(error => {
                    console.error('Error fetching user profile:', error);
                    popup.close();
                    this.updateSignInStatus(true);
                    resolve(true);
                  });
              } else {
                popup.close();
                reject(new Error('No access token received'));
              }
            }
          } catch (e) {
            // Cross-origin errors will occur until the redirect happens
            // This is normal and we can ignore these errors
            if (!e.toString().includes('cross-origin')) {
              console.error('Error polling popup:', e);
            }
          }
        }, 500);
        
        // Set a timeout to reject if authentication takes too long
        setTimeout(() => {
          if (!this.isSignedIn) {
            clearInterval(pollTimer);
            if (!popup.closed) popup.close();
            reject(new Error('Authentication timed out'));
          }
        }, 120000); // 2 minutes timeout
        
      } catch (error) {
        console.error('Error in signIn:', error);
        reject(error);
      }
    });
  }
  
  // Sign out
  async signOut() {
    try {
      console.log('Signing out...');
      
      // Clear stored token
      localStorage.removeItem('popup_auth_token');
      localStorage.removeItem('popup_auth_expiry');
      localStorage.removeItem('popup_auth_profile');
      
      this.accessToken = null;
      this.userProfile = null;
      this.updateSignInStatus(false);
      
      // Try to revoke the token by making a request to Google's revoke endpoint
      if (this.accessToken) {
        try {
          const revokeUrl = `https://accounts.google.com/o/oauth2/revoke?token=${this.accessToken}`;
          await fetch(revokeUrl);
          console.log('Token revoked');
        } catch (revokeError) {
          console.error('Error revoking token:', revokeError);
          // Continue with sign out even if revoke fails
        }
      }
      
      return true;
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
      
      // Store the profile
      localStorage.setItem('popup_auth_profile', JSON.stringify(data));
      
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

export default new PopupAuthService();
