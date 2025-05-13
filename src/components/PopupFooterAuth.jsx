import { useState, useEffect } from 'react';
import PopupAuthService from '../services/PopupAuthService';
import '../styles/FooterAuth.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faSignInAlt } from '@fortawesome/free-solid-svg-icons';

function PopupFooterAuth() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize auth service
  useEffect(() => {
    // Check if user is already signed in
    const currentSignInState = PopupAuthService.isUserSignedIn();
    console.log("Footer Auth - Current sign-in state:", currentSignInState);
    setIsSignedIn(currentSignInState);
    
    if (currentSignInState) {
      const profile = PopupAuthService.getUserProfile();
      console.log("Footer Auth - User profile:", profile);
      setUserProfile(profile);
    }
    
    // Set up auth change listener
    const unsubscribe = PopupAuthService.onSignInChanged((isAuthenticated) => {
      console.log("Footer Auth - Auth state changed:", isAuthenticated);
      setIsSignedIn(isAuthenticated);
      
      if (isAuthenticated) {
        const profile = PopupAuthService.getUserProfile();
        console.log("Footer Auth - Updated user profile:", profile);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });
    
    // Clean up the subscription
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle sign in
  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to sign in with popup...');
      await PopupAuthService.signIn();
      console.log('Sign in process completed');
    } catch (error) {
      console.error('Sign in failed:', error);
      setError(error.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to sign out...');
      await PopupAuthService.signOut();
      console.log('Sign out process completed');
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

export default PopupFooterAuth;
