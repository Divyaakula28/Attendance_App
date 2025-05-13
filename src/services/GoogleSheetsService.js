import axios from 'axios';
import DirectAuthService from './DirectAuthService';

// This service handles Google Sheets API operations
class GoogleSheetsService {
  constructor() {
    // You would typically get these values from environment variables
    this.API_KEY = 'AIzaSyAAxHsGKMs7L4QHAPmMAa6kUgP0zPngCxg'; // Your Google API key

    // ⚠️ IMPORTANT: Replace this with your actual Google Sheet ID
    // You can find this in the URL of your Google Sheet:
    // https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
    this.SPREADSHEET_ID = '1jXNAywv0yYTKwMDninwFVsDL8mtbcqmtdanLiH_9MS0';

    // Flag to use sample data when API fails - set to true to ensure app works even if API fails
    this.USE_SAMPLE_DATA_ON_ERROR = true;

    // Flag to indicate if we're using OAuth - set to true to use OAuth by default
    this.useOAuth = true;

    // Flag to indicate if the spreadsheet is accessible
    this.isSpreadsheetAccessible = false;

    // Flag to indicate if we've initialized
    this.isInitialized = false;
  }

  // Initialize the service
  async init() {
    if (this.isInitialized) {
      console.log('GoogleSheetsService already initialized');
      return;
    }

    console.log('Initializing GoogleSheetsService...');

    try {
      // Test if we can access the spreadsheet with API key first
      try {
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}?key=${this.API_KEY}`;
        const response = await axios.get(testUrl);
        console.log('Spreadsheet is accessible with API key:', response.data.properties.title);
        this.isSpreadsheetAccessible = true;
      } catch (error) {
        console.error('Spreadsheet is not accessible with API key:', error);
        this.isSpreadsheetAccessible = false;

        // Try to initialize OAuth as a fallback
        if (!this.useOAuth) {
          console.log('Trying OAuth as fallback...');
          this.useOAuth = true;
        }
      }

      // Initialize OAuth if needed
      if (this.useOAuth) {
        try {
          // No need to initialize DirectAuthService, it's already initialized
          console.log('GoogleSheetsService initialized with OAuth');

          // Check if user is already signed in
          if (DirectAuthService.isUserSignedIn()) {
            console.log('User is already signed in with OAuth');
          } else {
            console.log('User is not signed in with OAuth');
          }
        } catch (error) {
          console.error('Failed to initialize with OAuth, will use sample data', error);
          this.useOAuth = false;
          this.USE_SAMPLE_DATA_ON_ERROR = true;
        }
      }
    } catch (error) {
      console.error('Error during initialization:', error);
      this.USE_SAMPLE_DATA_ON_ERROR = true;
    }

    // Mark as initialized
    this.isInitialized = true;
  }

  // Check if the spreadsheet is accessible
  async checkSpreadsheetAccess() {
    try {
      console.log(`Checking access to spreadsheet: ${this.SPREADSHEET_ID}`);

      // Try to fetch metadata about the spreadsheet
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}`;
      console.log(`Request URL: ${url}`);

      const response = await axios.get(url, {
        params: {
          key: this.API_KEY,
          fields: 'properties.title'
        }
      });

      console.log('Spreadsheet is accessible:', response.data);
      this.isSpreadsheetAccessible = true;
      return true;
    } catch (error) {
      console.error('Error checking spreadsheet access:', error);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);

        if (error.response.status === 404) {
          console.error('Spreadsheet not found. Please check your spreadsheet ID.');
        } else if (error.response.status === 403) {
          console.error('Permission denied. Make sure your spreadsheet is shared publicly or with the appropriate permissions.');
        }
      }

      this.isSpreadsheetAccessible = false;
      return false;
    }
  }

  // Helper function to add delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch data from a Google Sheet
  async getSheetData(sheetName = 'Students', range = 'A1:Z1000') {
    try {
      console.log(`Fetching data from sheet: ${sheetName}, range: ${range}`);

      console.log(`Using Spreadsheet ID: ${this.SPREADSHEET_ID}`);

      // Try to fetch real data first
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${sheetName}!${range}`;
      console.log(`Request URL: ${url}`);

      const response = await axios.get(url, {
        params: {
          key: this.API_KEY,
          majorDimension: 'ROWS'
        },
      });

      console.log('Response received:', response.data);

      // Return the data even if it's empty
      return response.data.values || [];
    } catch (error) {
      console.error('Error fetching sheet data:', error);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);

        if (error.response.status === 404) {
          console.error('Spreadsheet or sheet not found. Please check your spreadsheet ID and sheet name.');
        } else if (error.response.status === 403) {
          console.error('Permission denied. Make sure your spreadsheet is shared publicly or with the appropriate permissions.');
        }
      }

      // Use sample data on error if configured to do so
      if (this.USE_SAMPLE_DATA_ON_ERROR) {
        console.log('Error occurred, using sample data');
        return this.getSampleData(sheetName);
      }

      // Otherwise throw the error
      throw error;
    }
  }

  // Provide sample data for demo purposes
  getSampleData(sheetName) {
    if (sheetName.toLowerCase() === 'students') {
      // Make sure the headers exactly match what we're looking for
      return [
        ['ID', 'Name', 'Class', 'School'],
        ['1', 'Harshavardhan', '6th Class', 'BV & B N high school Jandrapet'],
        ['2', 'Lakshmi priya p', '9th Class', 'BV & B N high school Jandrapet'],
        ['3', 'Madhu sree', '8th Class', 'BV & B N high school Jandrapet'],
        ['4', 'Muthukuri.thirupathamma', '10th Class', 'BV & B N high school Jandrapet'],
        ['5', 'Pallavi p', '11th Class', 'BV & B N high school Jandrapet'],
        ['6', 'Varshini D.', '12th Class', 'BV & B N high school Jandrapet'],
        ['7', 'Nitya Sri', '6th Class', 'BV & B N high school Jandrapet'],
        ['8', 'KOLLURU Sir Vidya', '7th Class', 'BV & B N high school Jandrapet'],
        ['9', 'Perikala Bhavishya', '8th Class', 'BV & B N high school Jandrapet'],
        ['10', 'Shanmukha priya', '9th Class', 'BV & B N high school Jandrapet'],
        ['11', 'M.Manasvi', '10th Class', 'BV & B N high school Jandrapet'],
        ['12', 'MANCHIKANTI NIHARIKA', '11th Class', 'BV & B N high school Jandrapet'],
        ['13', 'MANCHIKANTI VEERA VENKAT SIVA SAI VARUN', '12th Class', 'BV & B N high school Jandrapet'],
        ['14', 'KOLLURU shanvitha sir ram', '6th Class', 'BV & B N high school Jandrapet'],
        ['15', 'Hema sai', '7th Class', 'BV & B N high school Jandrapet'],
        ['16', 'Mokshitha', '8th Class', 'BV & B N high school Jandrapet']
      ];
    }

    // Default empty data
    return [['No Data Available']];
  }

  // Get student data from any sheet structure
  async getStudentData(sheetName = 'Students', range = 'A1:Z1000') {
    try {
      console.log(`Getting student data for sheet: ${sheetName}`);

      // Try to fetch real data first
      const data = await this.getSheetData(sheetName, range);

      // If we got no data, throw an error
      if (!data || data.length === 0) {
        throw new Error('No student data found in the sheet');
      }

      // Find the header row
      const headerRow = data[0] || [];
      console.log('Header row:', headerRow);

      // Try to identify columns based on headers
      let idColIndex = headerRow.findIndex(header =>
        header && header.toLowerCase().includes('id'));
      let nameColIndex = headerRow.findIndex(header =>
        header && header.toLowerCase().includes('name'));
      let classColIndex = headerRow.findIndex(header =>
        header && header.toLowerCase().includes('class'));
      let schoolColIndex = headerRow.findIndex(header =>
        header && header.toLowerCase().includes('school'));

      console.log('Initial column indices:', { idColIndex, nameColIndex, classColIndex, schoolColIndex });

      // If ID wasn't found, try alternative headers
      if (idColIndex === -1) {
        idColIndex = headerRow.findIndex(header =>
          header && header.toLowerCase().includes('number') || header && header.toLowerCase().includes('phone'));
      }

      // If we couldn't find the columns by header, use default positions
      if (idColIndex === -1) idColIndex = 0;
      if (nameColIndex === -1) nameColIndex = 1;
      if (classColIndex === -1) classColIndex = 2;
      if (schoolColIndex === -1) schoolColIndex = 3;

      console.log(`Column indices - ID: ${idColIndex}, Name: ${nameColIndex}, Class: ${classColIndex}, School: ${schoolColIndex}`);

      // Transform the data into an array of student objects
      // Skip the header row (index 0)
      return data.slice(1).map((row, index) => {
        // Make sure row has enough elements
        if (!row || row.length === 0) {
          return {
            id: `S${String(index + 1).padStart(3, '0')}`,
            name: `Student ${index + 1}`,
            class: 'N/A',
            school: 'N/A'
          };
        }

        // Generate a unique ID if none exists
        const id = (row[idColIndex] || `S${String(index + 1).padStart(3, '0')}`).toString();

        // Use the name from the sheet or generate one if missing
        const name = row[nameColIndex] || `Student ${index + 1}`;

        // Use class and school from the sheet or default values
        const classValue = row[classColIndex] || 'N/A';
        const school = row[schoolColIndex] || 'N/A';

        return {
          id,
          name,
          class: classValue,
          school
        };
      });
    } catch (error) {
      console.error('Error fetching student data:', error);

      // If we're configured to use sample data on error, generate student objects from sample data
      if (this.USE_SAMPLE_DATA_ON_ERROR) {
        console.log('API error in getStudentData, using sample data instead');
        const sampleData = this.getSampleData(sheetName);

        if (!sampleData || sampleData.length <= 1) {
          throw new Error('No sample student data available');
        }

        const headerRow = sampleData[0] || [];

        // Try to identify columns based on headers
        let idColIndex = headerRow.findIndex(header =>
          header && header.toLowerCase().includes('id'));
        let nameColIndex = headerRow.findIndex(header =>
          header && header.toLowerCase().includes('name'));
        let classColIndex = headerRow.findIndex(header =>
          header && header.toLowerCase().includes('class'));
        let schoolColIndex = headerRow.findIndex(header =>
          header && header.toLowerCase().includes('school'));

        console.log('Sample data column indices:', { idColIndex, nameColIndex, classColIndex, schoolColIndex });

        // If ID wasn't found, try alternative headers
        if (idColIndex === -1) {
          idColIndex = headerRow.findIndex(header =>
            header && header.toLowerCase().includes('number') || header && header.toLowerCase().includes('phone'));
        }

        // If we couldn't find the columns by header, use default positions
        if (idColIndex === -1) idColIndex = 0;
        if (nameColIndex === -1) nameColIndex = 1;
        if (classColIndex === -1) classColIndex = 2;
        if (schoolColIndex === -1) schoolColIndex = 3;

        // Transform the sample data into an array of student objects
        return sampleData.slice(1).map((row, index) => ({
          id: (row[idColIndex] || `S${String(index + 1).padStart(3, '0')}`).toString(),
          name: row[nameColIndex] || `Student ${index + 1}`,
          class: row[classColIndex] || 'N/A',
          school: row[schoolColIndex] || 'N/A'
        }));
      }

      // Otherwise throw the error
      throw error;
    }
  }

  // Get sheet metadata to find the last column
  async getSheetMetadata(sheetName = 'Students') {
    try {
      console.log(`Getting sheet metadata for: ${sheetName}`);

      // Try to fetch real metadata first
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}`;
      console.log(`Getting sheet metadata: ${url}`);

      const response = await axios.get(url, {
        params: {
          key: this.API_KEY,
          fields: 'sheets.properties'
        }
      });

      const sheets = response.data.sheets || [];
      const targetSheet = sheets.find(sheet =>
        sheet.properties.title.toLowerCase() === sheetName.toLowerCase()
      );

      if (!targetSheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      return targetSheet.properties;
    } catch (error) {
      console.error('Error getting sheet metadata:', error);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);

        if (error.response.status === 404) {
          console.error('Spreadsheet not found. Please check your spreadsheet ID.');
        } else if (error.response.status === 403) {
          console.error('Permission denied. Make sure your spreadsheet is shared publicly or with the appropriate permissions.');
        }
      }

      // Use mock data on error if configured to do so
      if (this.USE_SAMPLE_DATA_ON_ERROR) {
        console.log('Error getting sheet metadata, using mock data');
        return {
          title: sheetName,
          gridProperties: {
            rowCount: 100,
            columnCount: 10
          }
        };
      }

      // Otherwise throw the error
      throw error;
    }
  }

  // Add or update a date column in the sheet
  async addDateColumn(sheetName = 'Students', dateStr) {
    try {
      // First, get the current headers
      const headerData = await this.getSheetData(sheetName, 'A1:Z1');
      if (!headerData || !headerData[0]) {
        throw new Error('Could not retrieve headers');
      }

      const headers = headerData[0];

      // Check if the date column already exists
      const existingColumnIndex = headers.findIndex(header => header === dateStr);
      let columnIndex, columnLetter;

      if (existingColumnIndex !== -1) {
        // Date column already exists, use that column
        columnIndex = existingColumnIndex;
        columnLetter = this.columnIndexToLetter(columnIndex);
        console.log(`Date column "${dateStr}" already exists at position ${columnLetter}1`);
      } else {
        // Date column doesn't exist, create a new one
        columnIndex = headers.length;
        columnLetter = this.columnIndexToLetter(columnIndex);
        console.log(`Creating new date column "${dateStr}" at position ${columnLetter}1`);
      }

      console.log('Auth status check:');
      console.log('- useOAuth:', this.useOAuth);
      console.log('- isUserSignedIn:', DirectAuthService.isUserSignedIn());
      console.log('- Access token:', DirectAuthService.getAccessToken());

      // Check if we're using OAuth and the user is signed in
      if (this.useOAuth && DirectAuthService.isUserSignedIn()) {
        try {
          // Only add a new column if it doesn't exist
          if (existingColumnIndex === -1) {
            console.log(`Adding date column "${dateStr}" at position ${columnLetter}1 using OAuth`);
            console.log('Spreadsheet ID:', this.SPREADSHEET_ID);
            console.log('Range:', `${sheetName}!${columnLetter}1`);
            console.log('Values:', [[dateStr]]);

            // Use axios with the access token from DirectAuthService
            const accessToken = DirectAuthService.getAccessToken();
            console.log('Using access token:', accessToken);

            const response = await axios.put(
              `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${sheetName}!${columnLetter}1`,
              {
                values: [[dateStr]]
              },
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                },
                params: {
                  valueInputOption: 'USER_ENTERED'
                }
              }
            );

            console.log('Column added successfully:', response);
          } else {
            console.log(`Using existing date column "${dateStr}" at position ${columnLetter}1`);
          }

          return {
            columnIndex,
            columnLetter,
            isExisting: existingColumnIndex !== -1,
            simulated: false // This is a real update
          };
        } catch (oauthError) {
          console.error('OAuth update failed:', oauthError);
          console.error('Error details:', oauthError.result ? oauthError.result.error : 'No details available');

          // Fall through to simulation if OAuth fails
        }
      } else {
        console.log('OAuth not available or user not signed in. Using simulation mode.');
      }

      // If OAuth is not available or failed, simulate the update
      if (existingColumnIndex === -1) {
        console.log(`Simulating adding date column "${dateStr}" at position ${columnLetter}1`);
      } else {
        console.log(`Simulating using existing date column "${dateStr}" at position ${columnLetter}1`);
      }

      return {
        columnIndex,
        columnLetter,
        isExisting: existingColumnIndex !== -1,
        simulated: true // Flag to indicate this is a simulation
      };
    } catch (error) {
      console.error('Error adding/updating date column:', error);
      if (error.response && error.response.status === 401) {
        throw new Error('Authentication error: You need to sign in with your Google account to write to Google Sheets.');
      } else if (error.response && error.response.status === 403) {
        throw new Error('Permission denied: Make sure your Google Sheet is shared with edit permissions.');
      } else {
        throw error;
      }
    }
  }

  // Update attendance for a specific student by ID
  async updateAttendanceByStudentId(sheetName = 'Students', studentId, dateColumnLetter, status) {
    try {
      console.log(`Attempting to update attendance for student ID ${studentId} to ${status}`);

      // First, find the row with the matching student ID
      const studentData = await this.getSheetData(sheetName, 'A1:Z1000');

      // Get the header row to find the ID column
      const headerRow = studentData[0] || [];
      console.log('Header row:', headerRow);

      // Try to identify the ID column
      let idColIndex = headerRow.findIndex(header =>
        header && header.toLowerCase().includes('id') || header && header.toLowerCase().includes('number') || header && header.toLowerCase().includes('phone'));
      console.log('ID column index:', idColIndex);

      // If we couldn't find the ID column by header, use the first column
      if (idColIndex === -1) idColIndex = 0;

      // Find the row with the matching student ID
      let studentRowIndex = -1;
      for (let i = 1; i < studentData.length; i++) {
        if (studentData[i][idColIndex] === studentId) {
          studentRowIndex = i + 1; // +1 because sheet rows are 1-indexed
          break;
        }
      }
      console.log('Student row index:', studentRowIndex);

      if (studentRowIndex === -1) {
        throw new Error(`Student with ID ${studentId} not found`);
      }

      console.log('Auth status check:');
      console.log('- useOAuth:', this.useOAuth);
      console.log('- isUserSignedIn:', DirectAuthService.isUserSignedIn());
      console.log('- Access token:', DirectAuthService.getAccessToken());

      // Check if we're using OAuth and the user is signed in
      if (this.useOAuth && DirectAuthService.isUserSignedIn()) {
        try {
          console.log(`Updating cell ${dateColumnLetter}${studentRowIndex} to "${status}" for student ID ${studentId} using OAuth`);
          console.log('Spreadsheet ID:', this.SPREADSHEET_ID);
          console.log('Range:', `${sheetName}!${dateColumnLetter}${studentRowIndex}`);
          console.log('Values:', [[status]]);

          // Use axios with the access token from DirectAuthService
          const accessToken = DirectAuthService.getAccessToken();
          console.log('Using access token:', accessToken);

          const response = await axios.put(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${sheetName}!${dateColumnLetter}${studentRowIndex}`,
            {
              values: [[status]]
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              },
              params: {
                valueInputOption: 'USER_ENTERED'
              }
            }
          );

          console.log('Cell updated successfully:', response);

          return {
            success: true,
            studentRowIndex,
            dateColumnLetter,
            simulated: false // This is a real update
          };
        } catch (oauthError) {
          console.error('OAuth update failed:', oauthError);
          console.error('Error details:', oauthError.result ? oauthError.result.error : 'No details available');
          // Fall through to simulation if OAuth fails
        }
      } else {
        console.log('OAuth not available or user not signed in. Using simulation mode.');
      }

      // If OAuth is not available or failed, simulate the update
      console.log(`Simulating updating cell ${dateColumnLetter}${studentRowIndex} to "${status}" for student ID ${studentId}`);

      return {
        success: true,
        studentRowIndex,
        dateColumnLetter,
        simulated: true // Flag to indicate this is a simulation
      };
    } catch (error) {
      console.error('Error updating attendance:', error);
      if (error.response && error.response.status === 401) {
        throw new Error('Authentication error: You need to sign in with your Google account to write to Google Sheets.');
      } else if (error.response && error.response.status === 403) {
        throw new Error('Permission denied: Make sure your Google Sheet is shared with edit permissions.');
      } else {
        throw error;
      }
    }
  }

  // Helper function to convert column index to letter (0 = A, 1 = B, etc.)
  columnIndexToLetter(index) {
    let letter = '';

    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }

    return letter;
  }

  // Find a student row by ID
  async findStudentRowByID(sheetName = 'Students', studentId) {
    try {
      console.log(`Finding row for student ID ${studentId}`);

      // Get all student data
      const studentData = await this.getSheetData(sheetName, 'A1:Z1000');

      // Get the header row to find the ID column
      const headerRow = studentData[0] || [];
      console.log('Header row:', headerRow);

      // Try to identify the ID column
      let idColIndex = headerRow.findIndex(header =>
        header && header.toLowerCase().includes('id'));
      console.log('ID column index:', idColIndex);

      // If we couldn't find the ID column by header, use the first column
      if (idColIndex === -1) idColIndex = 0;

      // Find the row with the matching student ID
      let studentRowIndex = -1;
      for (let i = 1; i < studentData.length; i++) {
        if (studentData[i][idColIndex] === studentId) {
          studentRowIndex = i + 1; // +1 because sheet rows are 1-indexed
          break;
        }
      }

      if (studentRowIndex === -1) {
        throw new Error(`Student with ID ${studentId} not found`);
      }

      return {
        rowIndex: studentRowIndex,
        idColIndex,
        headerRow,
        studentData
      };
    } catch (error) {
      console.error('Error finding student row:', error);
      throw error;
    }
  }

  // Update a student by ID
  async updateStudentById(studentId, rowData) {
    try {
      console.log(`Updating student with ID ${studentId}`);

      // Find the student row
      const { rowIndex } = await this.findStudentRowByID('Students', studentId);

      // Check if we're using OAuth and the user is signed in
      if (this.useOAuth && DirectAuthService.isUserSignedIn()) {
        try {
          console.log(`Updating row ${rowIndex} for student ID ${studentId} using OAuth`);
          console.log('Spreadsheet ID:', this.SPREADSHEET_ID);
          console.log('Values:', [rowData]);

          // Use axios with the access token from DirectAuthService
          const accessToken = DirectAuthService.getAccessToken();
          console.log('Using access token:', accessToken);

          const response = await axios.put(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/Students!A${rowIndex}:E${rowIndex}`,
            {
              values: [rowData]
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              },
              params: {
                valueInputOption: 'USER_ENTERED'
              }
            }
          );

          console.log('Student updated successfully:', response);
          return response.result;
        } catch (oauthError) {
          console.error('OAuth update failed:', oauthError);
          console.error('Error details:', oauthError.result ? oauthError.result.error : 'No details available');
          throw oauthError;
        }
      } else {
        throw new Error('Authentication error: You need to sign in with your Google account to update students.');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      if (error.response && error.response.status === 401) {
        throw new Error('Authentication error: You need to sign in with your Google account to update students.');
      } else if (error.response && error.response.status === 403) {
        throw new Error('Permission denied: Make sure your Google Sheet is shared with edit permissions.');
      } else {
        throw error;
      }
    }
  }

  // Delete a student by ID
  async deleteStudentById(studentId) {
    try {
      console.log(`Deleting student with ID ${studentId}`);

      // Find the student row
      const { rowIndex } = await this.findStudentRowByID('Students', studentId);

      // Check if we're using OAuth and the user is signed in
      if (this.useOAuth && DirectAuthService.isUserSignedIn()) {
        try {
          console.log(`Deleting row ${rowIndex} for student ID ${studentId} using OAuth`);
          console.log('Spreadsheet ID:', this.SPREADSHEET_ID);

          // Use axios with the access token from DirectAuthService
          const accessToken = DirectAuthService.getAccessToken();
          console.log('Using access token:', accessToken);

          // Use the Sheets API to delete the row
          const response = await axios.post(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}:batchUpdate`,
            {
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId: 0, // Assuming the Students sheet is the first sheet
                      dimension: 'ROWS',
                      startIndex: rowIndex - 1, // 0-indexed
                      endIndex: rowIndex // exclusive end index
                    }
                  }
                }
              ]
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          console.log('Student deleted successfully:', response);
          return response.result;
        } catch (oauthError) {
          console.error('OAuth delete failed:', oauthError);
          console.error('Error details:', oauthError.result ? oauthError.result.error : 'No details available');
          throw oauthError;
        }
      } else {
        throw new Error('Authentication error: You need to sign in with your Google account to delete students.');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      if (error.response && error.response.status === 401) {
        throw new Error('Authentication error: You need to sign in with your Google account to delete students.');
      } else if (error.response && error.response.status === 403) {
        throw new Error('Permission denied: Make sure your Google Sheet is shared with edit permissions.');
      } else {
        throw error;
      }
    }
  }

  // Add a row to a Google Sheet
  async appendRow(sheetName = 'Students', values = []) {
    try {
      console.log(`Appending row to sheet: ${sheetName}, values:`, values);
      console.log('Auth status check:');
      console.log('- useOAuth:', this.useOAuth);
      console.log('- isUserSignedIn:', DirectAuthService.isUserSignedIn());
      console.log('- Access token:', DirectAuthService.getAccessToken());

      // Check if we're using OAuth and the user is signed in
      if (this.useOAuth && DirectAuthService.isUserSignedIn()) {
        try {
          console.log(`Appending row to sheet: ${sheetName} using OAuth`);
          console.log('Spreadsheet ID:', this.SPREADSHEET_ID);
          console.log('Values:', [values]);

          // Use axios with the access token from DirectAuthService
          const accessToken = DirectAuthService.getAccessToken();
          console.log('Using access token:', accessToken);

          const response = await axios.post(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${sheetName}!A1:append`,
            {
              values: [values]
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              },
              params: {
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS'
              }
            }
          );

          console.log('Row appended successfully:', response);
          return response.result;
        } catch (oauthError) {
          console.error('OAuth append failed:', oauthError);
          console.error('Error details:', oauthError.result ? oauthError.result.error : 'No details available');

          // If OAuth fails, try the API key method as fallback
          console.log('Falling back to API key method...');
        }
      } else {
        console.log('OAuth not available or user not signed in. Using API key method.');
      }

      // Fallback to API key method (this will likely fail for write operations)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${sheetName}!A1:append`;
      console.log(`Request URL: ${url}`);

      const response = await axios.post(
        url,
        {
          values: [values],
        },
        {
          params: {
            key: this.API_KEY,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
          },
        }
      );

      console.log('Append response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error appending row:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');

      if (error.response && error.response.status === 401) {
        throw new Error('Authentication error: You need to sign in with your Google account to add students.');
      } else if (error.response && error.response.status === 403) {
        throw new Error('Permission denied: Make sure your Google Sheet is shared with edit permissions.');
      } else {
        throw error;
      }
    }
  }
}

export default new GoogleSheetsService();
