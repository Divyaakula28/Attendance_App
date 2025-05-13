import { useState, useEffect } from 'react';
import DirectAuthService from '../services/DirectAuthService';
import '../styles/FooterAuth.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faSignInAlt } from '@fortawesome/free-solid-svg-icons';

function DirectFooterAuth() {
  const [isSignedIn, setIsSignedIn] = useState(DirectAuthService.isUserSignedIn());
  const [userProfile, setUserProfile] = useState(DirectAuthService.getUserProfile());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for changes in authentication state
  useEffect(() => {
    // Check every second for changes in auth state
    // This is needed because the page might be reloaded after authentication
    const interval = setInterval(() => {
      const currentSignInState = DirectAuthService.isUserSignedIn();
      if (currentSignInState !== isSignedIn) {
        console.log("Auth state changed:", currentSignInState);
        setIsSignedIn(currentSignInState);
        
        if (currentSignInState) {
          const profile = DirectAuthService.getUserProfile();
          console.log("Updated user profile:", profile);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isSignedIn]);

  // Handle sign in
  const handleSignIn = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Redirecting to Google sign-in...');
      DirectAuthService.signIn();
      // Note: The page will redirect, so we won't reach the code below
    } catch (error) {
      console.error('Sign in failed:', error);
      setError(error.message || 'Sign in failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Signing out...');
      await DirectAuthService.signOut();
      console.log('Sign out completed');
      setIsSignedIn(false);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      setError('Sign out failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="footer-auth">
      {error && (
        <div className="footer-auth-error">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="footer-auth-loading">
          Loading...
        </div>
      ) : isSignedIn && userProfile ? (
        <div className="footer-auth-signed-in">
          <span className="footer-email">
            <span className="krishna-icon">🪔</span> Signed in as: {userProfile.email}
          </span>
          <button className="footer-sign-out" onClick={handleSignOut} disabled={isLoading}>
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span>Sign Out</span>
          </button>
        </div>
      ) : (
        <button className="footer-sign-in" onClick={handleSignIn} disabled={isLoading}>
          <FontAwesomeIcon icon={faSignInAlt} />
          <span>Sign In with Google</span>
        </button>
      )}
    </div>
  );
}

export default DirectFooterAuth;
