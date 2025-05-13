import { useState, useEffect } from 'react'
import './App.css'
import SheetDataDisplay from './components/SheetDataDisplay'
import SheetDataInput from './components/SheetDataInput'
import GoogleSheetsService from './services/GoogleSheetsService'
import DirectFooterAuth from './components/DirectFooterAuth'

function App() {
  const [activeTab, setActiveTab] = useState('display')
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState(null)

  // Initialize the Google Sheets service
  useEffect(() => {
    const initService = async () => {
      try {
        await GoogleSheetsService.init();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Google Sheets service:', error);
        setInitError('Failed to initialize Google Sheets service. The app will use sample data.');
        setIsInitialized(true); // Still mark as initialized so the app can function with sample data
      }
    }

    initService();
  }, []);

  // Show loading indicator while initializing
  if (!isInitialized) {
    return (
      <div className="loading-page">
        <div className="loading-spinner large"></div>
        <p>Hare Krishna! Initializing Google Sheets integration...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <div className="header-title">
            <h1>Krishna Attendance Tracker</h1>
            <p>Track and manage ISKCON student attendance</p>
          </div>
        </div>
      </header>

      <div className="tabs">
        <button
          className={activeTab === 'display' ? 'active' : ''}
          onClick={() => setActiveTab('display')}
        >
          View Attendance
        </button>
        <button
          className={activeTab === 'input' ? 'active' : ''}
          onClick={() => setActiveTab('input')}
        >
          Record Attendance
        </button>
      </div>

      <main style={{ width: '100%', maxWidth: '100%', padding: '1.8rem 0', boxSizing: 'border-box' }}>
        {activeTab === 'display' ? (
          <SheetDataDisplay />
        ) : (
          <SheetDataInput />
        )}
      </main>

      <footer>
        {initError ? (
          <p><span className="error-message">{initError}</span></p>
        ) : (
          <DirectFooterAuth />
        )}
      </footer>
    </div>
  )
}

export default App
