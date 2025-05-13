// A simplified Google OAuth authentication service that uses direct redirection
class DirectAuthService {
  constructor() {
    // Your OAuth client ID - replace with your actual client ID
    this.CLIENT_ID = '192289058482-mff9g02nleh6tnhvu0k43de96mvpcfbc.apps.googleusercontent.com';
    
    // Authentication state
    this.isSignedIn = false;
    this.accessToken = null;
    this.userProfile = null;
    
    // Check if we have a stored token
    this.checkStoredToken();
    
    // Check if we have a token in the URL (after redirect)
    this.checkUrlToken();
  }
  
  // Check if we have a stored token
  checkStoredToken() {
    const storedToken = localStorage.getItem('direct_auth_token');
    const storedExpiry = localStorage.getItem('direct_auth_expiry');
    const storedProfile = localStorage.getItem('direct_auth_profile');
    
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
    } else {
      console.log('No valid stored token found');
      this.isSignedIn = false;
      this.accessToken = null;
      this.userProfile = null;
      
      // Clear any expired tokens
      if (storedToken || storedExpiry || storedProfile) {
        localStorage.removeItem('direct_auth_token');
        localStorage.removeItem('direct_auth_expiry');
        localStorage.removeItem('direct_auth_profile');
      }
    }
  }
  
  // Check if we have a token in the URL (after redirect)
  checkUrlToken() {
    // Check if we have a token in the URL hash
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const expiresIn = hashParams.get('expires_in');
      
      if (accessToken && expiresIn) {
        console.log('Found token in URL');
        this.accessToken = accessToken;
        
        // Store the token and expiry
        const expiryTime = new Date().getTime() + (parseInt(expiresIn) * 1000);
        localStorage.setItem('direct_auth_token', accessToken);
        localStorage.setItem('direct_auth_expiry', expiryTime.toString());
        
        // Fetch user profile
        this.fetchUserProfile().then(() => {
          this.isSignedIn = true;
          
          // Remove the token from the URL to prevent issues on refresh
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      }
    }
  }
  
  // Sign in with Google using direct redirection
  signIn() {
    // Create the OAuth URL
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    const scope = encodeURIComponent('https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
    const responseType = 'token';
    const prompt = 'consent';
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${this.CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&prompt=${prompt}`;
    
    // Redirect to the auth URL
    console.log('Redirecting to Google auth URL:', authUrl);
    window.location.href = authUrl;
  }
  
  // Sign out
  signOut() {
    console.log('Signing out...');
    
    // Clear stored token
    localStorage.removeItem('direct_auth_token');
    localStorage.removeItem('direct_auth_expiry');
    localStorage.removeItem('direct_auth_profile');
    
    this.accessToken = null;
    this.userProfile = null;
    this.isSignedIn = false;
    
    // Reload the page to ensure a clean state
    window.location.reload();
    
    return Promise.resolve(true);
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
      localStorage.setItem('direct_auth_profile', JSON.stringify(data));
      
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
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

export default new DirectAuthService();
