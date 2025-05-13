import { useState, useEffect, useCallback, useMemo } from 'react';
import GoogleSheetsService from '../services/GoogleSheetsService';
import AttendanceAnalytics from './AttendanceAnalytics';
import AddStudentForm from './AddStudentForm';
import EditStudentForm from './EditStudentForm';
import DeleteStudentConfirmation from './DeleteStudentConfirmation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FluteFontAwesomeIcon from './FluteFontAwesomeIcon';
import DharmaChakraIcon from './DharmaChakraIcon';

function SheetDataDisplay() {
  // State for data and UI
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetName, setSheetName] = useState('Students');
  const [range, setRange] = useState('A1:Z1000');
  const [filters, setFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [viewMode, setViewMode] = useState('data'); // 'data' or 'analytics'
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(15); // Show 15 records per page

  // Use useMemo to prevent unnecessary re-renders
  const apiDetails = useMemo(() => ({
    apiKey: GoogleSheetsService.API_KEY,
    spreadsheetId: GoogleSheetsService.SPREADSHEET_ID
  }), []);

  // Derived data (must be defined before any conditional returns)
  const headers = useMemo(() => data[0] || [], [data]);
  const rows = useMemo(() => data.slice(1), [data]);

  // Get unique values for each column for filtering
  const uniqueColumnValues = useMemo(() => {
    const values = {};

    headers.forEach((header, index) => {
      if (!header) return;

      // Get all values for this column
      const columnValues = rows.map(row => row[index] || '');

      // Filter to unique values and sort
      values[index] = [...new Set(columnValues)]
        .filter(Boolean)
        .sort((a, b) => a.toString().localeCompare(b.toString()));
    });

    return values;
  }, [headers, rows]);

  // Apply filters to rows
  const filteredRows = useMemo(() => {
    if (Object.keys(filters).length === 0) return rows;

    return rows.filter(row => {
      // Check if row matches all active filters
      return Object.entries(filters).every(([columnIndex, selectedValues]) => {
        if (!selectedValues || selectedValues.length === 0) return true;
        const value = row[columnIndex] || '';
        return selectedValues.includes(value.toString());
      });
    });
  }, [rows, filters]);

  // Calculate pagination values
  const totalPages = useMemo(() => Math.ceil(filteredRows.length / recordsPerPage), [filteredRows, recordsPerPage]);

  // Get current page records
  const currentRecords = useMemo(() => {
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    return filteredRows.slice(indexOfFirstRecord, indexOfLastRecord);
  }, [filteredRows, currentPage, recordsPerPage]);

  // Change page
  const paginate = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of table
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Go to next page
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  // Go to previous page
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  // Toggle filter dropdown for a column
  const toggleFilterDropdown = useCallback((columnIndex) => {
    setActiveFilterColumn(prev => prev === columnIndex ? null : columnIndex);
  }, []);

  // Function to handle edit student
  const handleEditStudent = useCallback((student) => {
    setSelectedStudent(student);
    setShowEditStudentModal(true);
  }, []);

  // Function to handle delete student
  const handleDeleteStudent = useCallback((student) => {
    setSelectedStudent(student);
    setShowDeleteStudentModal(true);
  }, []);

  // Handle filter selection
  const handleFilterChange = useCallback((columnIndex, value, isChecked) => {
    setFilters(prev => {
      const currentFilters = prev[columnIndex] || [];

      if (isChecked) {
        // Add value to filter
        return {
          ...prev,
          [columnIndex]: [...currentFilters, value]
        };
      } else {
        // Remove value from filter
        return {
          ...prev,
          [columnIndex]: currentFilters.filter(v => v !== value)
        };
      }
    });

    // Reset to first page when filter changes
    setCurrentPage(1);
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({});
    setActiveFilterColumn(null);
    setCurrentPage(1); // Reset to first page when clearing filters
  }, []);

  // Clear filters for a specific column
  const clearColumnFilter = useCallback((columnIndex) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnIndex];
      return newFilters;
    });
    setCurrentPage(1); // Reset to first page when clearing a column filter
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if API key and Spreadsheet ID are set
      if (!apiDetails.apiKey || apiDetails.apiKey.trim() === '') {
        setError('API Key is missing. Please add your Google API Key in the GoogleSheetsService.js file.');
        setLoading(false);
        return;
      }

      if (!apiDetails.spreadsheetId || apiDetails.spreadsheetId.trim() === '') {
        setError('Spreadsheet ID is missing. Please add your Spreadsheet ID in the GoogleSheetsService.js file.');
        setLoading(false);
        return;
      }

      // Try to fetch real data from Google Sheets
      const sheetData = await GoogleSheetsService.getSheetData(sheetName, range);

      if (!sheetData || sheetData.length === 0) {
        setError(`No data found in sheet "${sheetName}" with range "${range}". Please check your sheet name and range.`);
      } else {
        console.log('Successfully fetched data:', sheetData);
        setData(sheetData);
      }
    } catch (err) {
      console.error('Error in component:', err);

      // Provide more specific error messages based on the error
      if (err.response) {
        if (err.response.status === 400) {
          setError('Bad Request (400): There might be an issue with your sheet name or range. Make sure they are correct.');
        } else if (err.response.status === 403) {
          setError('Forbidden (403): You don\'t have permission to access this spreadsheet. Make sure it\'s shared publicly or with your account.');
        } else if (err.response.status === 404) {
          setError('Not Found (404): The spreadsheet could not be found. Check your Spreadsheet ID.');
        } else {
          setError(`Error ${err.response.status}: ${err.response.data?.error?.message || 'Unknown error'}`);
        }
      } else if (err.request) {
        setError('Network Error: Could not connect to Google Sheets API. Check your internet connection.');
      } else {
        setError(`Failed to fetch data from Google Sheets: ${err.message}. Please check your API key and spreadsheet ID.`);
      }
    } finally {
      setLoading(false);
    }
  }, [sheetName, range, apiDetails]);

  // Fetch data when component mounts or when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeFilterColumn !== null &&
          !event.target.closest('.filter-dropdown') &&
          !event.target.closest('.filter-icon')) {
        setActiveFilterColumn(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeFilterColumn]);

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  if (error) {
    return (
      <div className="sheet-data-display">
        <h2>Sheet Data</h2>
        <div className="sheet-controls">
          <div>
            <label htmlFor="sheetName">Sheet Name:</label>
            <input
              id="sheetName"
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="range">Range:</label>
            <input
              id="range"
              type="text"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          </div>

          <button onClick={fetchData}>Refresh Data</button>
        </div>

        <div className="error">
          <h3>Error:</h3>
          <p>{error}</p>
          <div className="api-details">
            <p><strong>API Details:</strong></p>
            <p>API Key: {apiDetails.apiKey ? `${apiDetails.apiKey.substring(0, 5)}...` : 'Not set'}</p>
            <p>Spreadsheet ID: {apiDetails.spreadsheetId || 'Not set'}</p>
            <p>Sheet Name: {sheetName}</p>
            <p>Range: {range}</p>
          </div>
          <p>
            <strong>Troubleshooting:</strong>
          </p>
          <ul>
            <li>Make sure your Google API Key is correct</li>
            <li>Make sure your Spreadsheet ID is correct</li>
            <li>Make sure the Google Sheets API is enabled in your Google Cloud Console</li>
            <li>Make sure your sheet is publicly accessible or shared with your account</li>
            <li>Try a different sheet name or range</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!data || !data.length) {
    return (
      <div className="sheet-data-display">
        <h2>Sheet Data</h2>
        <div className="sheet-controls">
          <div>
            <label htmlFor="sheetName">Sheet Name:</label>
            <input
              id="sheetName"
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="range">Range:</label>
            <input
              id="range"
              type="text"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          </div>

          <button onClick={fetchData}>Refresh Data</button>
        </div>

        <div className="no-data">
          <p>No data found in the sheet.</p>
          <p>Make sure:</p>
          <ul>
            <li>Your sheet contains data</li>
            <li>The sheet name "{sheetName}" is correct</li>
            <li>The range "{range}" includes your data</li>
          </ul>
        </div>
      </div>
    );
  }



  // Function to get status class for styling
  const getStatusClass = (status) => {
    if (!status) return '';

    status = status.toString().toLowerCase();
    if (status.includes('present')) return 'status-present';
    if (status.includes('absent')) return 'status-absent';
    return '';
  };

  // Function to format date for better display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';

    try {
      // Handle different date formats
      let date;
      if (dateStr.includes('-')) {
        // YYYY-MM-DD format
        date = new Date(dateStr);
      } else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
        // MM/DD/YYYY format
        const parts = dateStr.split('/');
        date = new Date(parts[2], parts[0] - 1, parts[1]);
      } else {
        // Try direct parsing
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) return dateStr; // Return original if invalid

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return dateStr; // Return original on error
    }
  };

  // Function to format phone numbers - just return digits only
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';

    // Remove all non-digit characters and return just the numbers
    return ('' + phone).replace(/\D/g, '');
  };

  // Toggle card expansion
  const toggleCard = (rowIndex, e) => {
    // Don't toggle if clicking on action buttons
    if (e.target.closest('.student-card-actions')) {
      return;
    }
    setExpandedCards(prev => ({
      ...prev,
      [rowIndex]: !prev[rowIndex]
    }));
  };

  // Render component
  return (
    <div className="sheet-data-display">
      <h2>Attendance Records</h2>
      <div className="sheet-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={fetchData} className="refresh-button" title="Refresh Data">
            <span className="refresh-icon"><DharmaChakraIcon /></span>
          </button>

          <div className="view-toggle">
            <button
              className={viewMode === 'data' ? 'active' : ''}
              onClick={() => setViewMode('data')}
            >
              View Data
            </button>
            <button
              className={viewMode === 'analytics' ? 'active' : ''}
              onClick={() => setViewMode('analytics')}
            >
              View Analytics
            </button>
          </div>
        </div>

        {viewMode === 'data' && (
          <button
            className="add-student-button"
            onClick={() => setShowAddStudentModal(true)}
          >
            <span className="add-icon"><FontAwesomeIcon icon="hands-praying" /></span> Add Student
          </button>
        )}

        {Object.keys(filters).length > 0 && viewMode === 'data' && (
          <button onClick={clearAllFilters} className="clear-all-filters-button">
            <span className="filter-icon"><FluteFontAwesomeIcon /></span> Clear All Filters
          </button>
        )}
      </div>

      {viewMode === 'data' && Object.keys(filters).length > 0 && (
        <div className="active-filters-indicator">
          <span className="filter-count">{Object.keys(filters).length} active {Object.keys(filters).length === 1 ? 'filter' : 'filters'}</span>
          <span className="records-count">Showing {filteredRows.length} of {rows.length} records</span>
        </div>
      )}

      {viewMode === 'analytics' ? (
        <AttendanceAnalytics data={data} />
      ) : (
        <>


          <div className="table-container responsive-table-container">
        {/* Desktop Table View */}
        <table className="attendance-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="column-header">
                  <div className="filter-wrapper">
                    <span className="header-text">{header || `Column ${index + 1}`}</span>
                    <button
                      className={`filter-icon ${Object.keys(filters).includes(index.toString()) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFilterDropdown(index.toString());
                      }}
                      title="Filter"
                    >
                      <FluteFontAwesomeIcon /> {/* Krishna's flute icon */}
                    </button>
                  </div>

                  {activeFilterColumn === index.toString() && (
                    <div className="filter-dropdown">
                      <div className="filter-dropdown-header">
                        <span>Filter: {header}</span>
                        <button
                          className="clear-filter-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearColumnFilter(index.toString());
                          }}
                        >
                          Clear
                        </button>
                      </div>

                      <div className="filter-dropdown-content">
                        {uniqueColumnValues[index] && uniqueColumnValues[index].length > 0 ? (
                          uniqueColumnValues[index].map((value, valueIndex) => (
                            <label key={valueIndex} className="filter-checkbox-label">
                              <input
                                type="checkbox"
                                checked={filters[index.toString()]?.includes(value) || false}
                                onChange={(e) => handleFilterChange(index.toString(), value, e.target.checked)}
                              />
                              <span className="filter-value-text">{value}</span>
                            </label>
                          ))
                        ) : (
                          <div className="no-values">No values to filter</div>
                        )}
                      </div>
                    </div>
                  )}
                </th>
              ))}
              <th className="column-header actions-header">
                <div className="filter-wrapper">
                  <span className="header-text">Actions</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((row, rowIndex) => {
              // Ensure all rows have the same number of columns
              const normalizedRow = [...row];
              if (normalizedRow.length < headers.length) {
                normalizedRow.push(...Array(headers.length - normalizedRow.length).fill(''));
              }

              // Create a student object from the row data
              const student = {
                id: normalizedRow[0] || '',
                name: normalizedRow[1] || '',
                school: normalizedRow[2] || '',
                class: normalizedRow[3] || '',
                mobileNumber: normalizedRow[4] || ''
              };

              return (
                <tr key={rowIndex}>
                  {normalizedRow.map((cell, cellIndex) => {
                    // Apply special formatting based on column type
                    const headerText = (headers[cellIndex] || '').toLowerCase();
                    const cellValue = cell || '';

                    // Get the header text for data-label
                    const headerLabel = headers[cellIndex] || `Column ${cellIndex + 1}`;

                    // Format date cells
                    if (headerText.includes('date')) {
                      return (
                        <td key={cellIndex} title={cellValue} data-label={headerLabel}>
                          <span className="date-cell">{formatDate(cellValue)}</span>
                        </td>
                      );
                    }
                    // Apply status styling
                    else if (
                      headerText.includes('status') ||
                      headerText.includes('present') ||
                      headerText.includes('absent') ||
                      (cellIndex > 3 && (cellValue.toLowerCase().includes('present') || cellValue.toLowerCase().includes('absent')))
                    ) {
                      return (
                        <td key={cellIndex} className={getStatusClass(cellValue)} title={cellValue} data-label="Status">
                          {cellValue}
                        </td>
                      );
                    }
                    // Format phone numbers
                    else if (headerText.includes('phone') || headerText.includes('number')) {
                      return (
                        <td
                          key={cellIndex}
                          title={cellValue}
                          data-label={headerLabel}
                        >
                          <span className="phone-number">
                            {formatPhoneNumber(cellValue)}
                          </span>
                        </td>
                      );
                    }
                    // Format student name with emphasis
                    else if (headerText.includes('name') || headerText.includes('student')) {
                      return <td key={cellIndex} style={{ fontWeight: '600', color: '#1a73e8' }} title={cellValue} data-label={headerLabel}>{cellValue}</td>;
                    }
                    // Format student ID with emphasis
                    else if (headerText.includes('id') || headerText === 'studentid') {
                      return (
                        <td key={cellIndex} title={cellValue} data-label={headerLabel}>
                          <span className="student-id-cell">{cellValue}</span>
                        </td>
                      );
                    }
                    // Format class/grade with emphasis
                    else if (headerText.includes('class') || headerText.includes('grade')) {
                      return <td key={cellIndex} style={{ fontWeight: '500', color: '#188038' }} title={cellValue} data-label={headerLabel}>{cellValue}</td>;
                    }
                    // Format school with emphasis
                    else if (headerText.includes('school')) {
                      return <td key={cellIndex} style={{ fontWeight: '500', color: '#c5221f' }} title={cellValue} data-label={headerLabel}>{cellValue}</td>;
                    }
                    // Regular cell
                    else {
                      return <td key={cellIndex} title={cellValue} data-label={headerLabel}>{cellValue}</td>;
                    }
                  })}

                  {/* Action buttons */}
                  <td className="student-actions" data-label="Actions">
                    <button
                      className="edit-button"
                      onClick={() => handleEditStudent(student)}
                      title="Edit Student"
                    >
                      <FontAwesomeIcon icon="edit" />
                    </button>
                    <button
                      className="delete-button-small"
                      onClick={() => handleDeleteStudent(student)}
                      title="Delete Student"
                    >
                      <FontAwesomeIcon icon="trash-alt" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="mobile-card-container">
          {currentRecords.map((row, rowIndex) => {
            // Ensure all rows have the same number of columns
            const normalizedRow = [...row];
            if (normalizedRow.length < headers.length) {
              normalizedRow.push(...Array(headers.length - normalizedRow.length).fill(''));
            }

            // Create a student object from the row data
            const student = {
              id: normalizedRow[0] || '',
              name: normalizedRow[1] || '',
              school: normalizedRow[2] || '',
              class: normalizedRow[3] || '',
              mobileNumber: normalizedRow[4] || ''
            };

            // Get attendance status columns (columns after the first 5)
            const attendanceColumns = normalizedRow.slice(5).map((value, index) => ({
              date: headers[index + 5] || `Date ${index + 1}`,
              status: value || ''
            }));

            const isCardExpanded = expandedCards[rowIndex] || false;

            return (
              <div
                key={rowIndex}
                className={`student-card ${isCardExpanded ? 'expanded' : ''}`}
                onClick={(e) => toggleCard(rowIndex, e)}
              >
                <div className="student-card-header">
                  <div className="student-card-id">{student.id}</div>
                  <div className="student-card-name">{student.name}</div>
                  <div className="student-card-toggle">
                    <FontAwesomeIcon icon={isCardExpanded ? "chevron-up" : "chevron-down"} />
                  </div>
                </div>

                {isCardExpanded && (
                  <>
                    <div className="student-card-content">
                      <div className="student-card-field">
                        <span className="student-card-label">School</span>
                        <span className="student-card-value student-card-school">{student.school}</span>
                      </div>

                      <div className="student-card-field">
                        <span className="student-card-label">Class</span>
                        <span className="student-card-value student-card-class">{student.class}</span>
                      </div>

                      <div className="student-card-field">
                        <span className="student-card-label">Mobile</span>
                        <span className="student-card-value">{formatPhoneNumber(student.mobileNumber)}</span>
                      </div>

                      {attendanceColumns.map((attendance, index) => {
                        const isPresent = attendance.status.toLowerCase().includes('present');
                        const isAbsent = attendance.status.toLowerCase().includes('absent');
                        const statusClass = isPresent ? 'present' : (isAbsent ? 'absent' : '');

                        if (!attendance.status) return null;

                        return (
                          <div key={index} className="student-card-field">
                            <span className="student-card-label">{formatDate(attendance.date)}</span>
                            <span className={`student-card-value student-card-status ${statusClass}`}>
                              {attendance.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="student-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="edit-button"
                        onClick={() => handleEditStudent(student)}
                        title="Edit Student"
                      >
                        <FontAwesomeIcon icon="edit" />
                      </button>
                      <button
                        className="delete-button-small"
                        onClick={() => handleDeleteStudent(student)}
                        title="Delete Student"
                      >
                        <FontAwesomeIcon icon="trash-alt" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {currentRecords.length > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0} to {Math.min(currentPage * recordsPerPage, filteredRows.length)} of {filteredRows.length} records
          </div>
          <div className="pagination-controls">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="pagination-button prev-button"
              title="Previous Page"
            >
              <span className="pagination-icon">❮</span>
            </button>

            {/* Page numbers */}
            <div className="pagination-pages">
              {[...Array(totalPages).keys()].map(number => {
                // Show first page, last page, current page, and pages around current page
                const pageNumber = number + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={`pagination-button page-number ${currentPage === pageNumber ? 'active' : ''}`}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  (pageNumber === 2 && currentPage > 3) ||
                  (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                ) {
                  // Show ellipsis
                  return <span key={pageNumber} className="pagination-ellipsis">…</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="pagination-button next-button"
              title="Next Page"
            >
              <span className="pagination-icon">❯</span>
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <AddStudentForm
          onClose={() => setShowAddStudentModal(false)}
          onStudentAdded={() => {
            setShowAddStudentModal(false);
            fetchData();
          }}
        />
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && selectedStudent && (
        <EditStudentForm
          student={selectedStudent}
          onClose={() => setShowEditStudentModal(false)}
          onStudentUpdated={() => {
            setShowEditStudentModal(false);
            fetchData();
          }}
        />
      )}

      {/* Delete Student Modal */}
      {showDeleteStudentModal && selectedStudent && (
        <DeleteStudentConfirmation
          student={selectedStudent}
          onClose={() => setShowDeleteStudentModal(false)}
          onStudentDeleted={() => {
            setShowDeleteStudentModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

export default SheetDataDisplay;

