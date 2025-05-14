import { useState, useEffect, useCallback, useRef } from 'react';
import GoogleSheetsService from '../services/GoogleSheetsService';
import AuthService from '../services/AuthService';
import AttendanceModal from './AttendanceModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/AttendanceCards.css';

function SheetDataInput() {
  // Create a ref for the top of the component
  const topRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetName] = useState('Students');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentError, setStudentError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existingDates, setExistingDates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10); // Show 10 records per page
  const [filters, setFilters] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);

  // Format date as YYYY-MM-DD string
  function formatDateForSheet(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format date for display (e.g., "May 6, 2025")
  function formatDateForDisplay(date) {
    try {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return date.toString();
    }
  }

  // Fetch students from the Google Sheet
  const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      setStudentError(null);

      // Try to fetch real student data
      const studentData = await GoogleSheetsService.getStudentData(sheetName);
      console.log('Fetched student data:', studentData);

      // Format date for column header (e.g., "2025-05-06")
      const formattedDate = formatDateForSheet(selectedDate);
      console.log('Formatted date for attendance lookup:', formattedDate);

      // Check if there's existing attendance data for this date
      console.log('Checking for existing attendance data for date:', formattedDate);
      const existingAttendance = await GoogleSheetsService.getAttendanceForDate(sheetName, formattedDate);
      console.log('Existing attendance data:', existingAttendance);

      // Add attendance status field to each student
      const studentsWithStatus = studentData.map(student => {
        // If we have existing attendance data for this student, use it
        if (existingAttendance && existingAttendance[student.id]) {
          console.log(`Student ${student.id} has existing attendance: ${existingAttendance[student.id]}`);
          return {
            ...student,
            attendanceStatus: existingAttendance[student.id]
          };
        }
        // Otherwise default to Present
        console.log(`Student ${student.id} has no existing attendance, defaulting to Present`);
        return {
          ...student,
          attendanceStatus: 'Present'
        };
      });

      setStudents(studentsWithStatus);
      console.log('Final student data with attendance status:', studentsWithStatus);
    } catch (error) {
      console.error('Error fetching students:', error);

      if (error.response) {
        setStudentError(`API Error (${error.response.status}): ${error.response.data?.error?.message || 'Unknown error'}`);
      } else if (error.request) {
        setStudentError('Network Error: Could not connect to Google Sheets API. Check your internet connection.');
      } else {
        setStudentError(`Failed to load student data: ${error.message}`);
      }
    } finally {
      setLoadingStudents(false);
    }
  }, [sheetName, selectedDate]);

  // Check if a date already has attendance records
  const checkExistingDates = useCallback(async () => {
    try {
      // Get the header row to find existing date columns
      const headerData = await GoogleSheetsService.getSheetData(sheetName, 'A1:Z1');

      if (headerData && headerData[0]) {
        // Filter headers that look like dates (YYYY-MM-DD format)
        const dateHeaders = headerData[0].filter(header =>
          header && /^\d{4}-\d{2}-\d{2}$/.test(header)
        );

        console.log('Found existing date columns:', dateHeaders);
        setExistingDates(dateHeaders);
      }
    } catch (error) {
      console.error('Error checking existing dates:', error);
    }
  }, [sheetName]);

  // Load student data and check existing dates when component mounts
  useEffect(() => {
    fetchStudents();
    checkExistingDates();
  }, [fetchStudents, checkExistingDates]);

  // Handle attendance status change for a student
  const handleAttendanceChange = (studentId, newStatus) => {
    setStudents(prevStudents =>
      prevStudents.map(student =>
        student.id === studentId
          ? { ...student, attendanceStatus: newStatus }
          : student
      )
    );
  };

  // Apply filters to students
  const getFilteredStudents = () => {
    return students.filter(student => {
      // Check if student matches all active filters
      for (const [field, value] of Object.entries(filters)) {
        if (value && student[field] !== value) {
          return false;
        }
      }
      return true;
    });
  };

  // Calculate pagination values based on filtered students
  const totalPages = Math.ceil(getFilteredStudents().length / recordsPerPage);

  // Handle filter button click
  const handleFilterClick = (e, field) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent event bubbling

    // Toggle filter dropdown
    setActiveFilter(activeFilter === field ? null : field);

    // Get unique values for the selected field
    if (field && activeFilter !== field) {
      // This will be used to populate the filter dropdown
      console.log(`Getting unique values for ${field}`);
    }
  };

  // Get current page records
  const getCurrentPageStudents = () => {
    const filteredStudents = getFilteredStudents();
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    return filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);
  };

  // Change page
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of students list
    const studentsList = document.querySelector('.students-list');
    if (studentsList) {
      studentsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Go to next page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Go to previous page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Open the attendance modal
  const openAttendanceModal = () => {
    setIsModalOpen(true);
  };

  // Handle completion of attendance from modal
  const handleModalComplete = (updatedStudents) => {
    setStudents(updatedStudents);
    handleSubmit();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (students.length === 0) {
      setStatus({
        message: 'No students to record attendance for.',
        type: 'error'
      });
      // Scroll to top to show the error message
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);

      // Check if user is signed in with Google
      const isSignedIn = AuthService.isUserSignedIn();
      console.log('User signed in status:', isSignedIn);
      console.log('Access token:', AuthService.getAccessToken());

      // Format date for column header (e.g., "2025-05-06")
      const formattedDate = formatDateForSheet(selectedDate);
      console.log('Recording attendance for date:', formattedDate);

      // 1. Add or update a column with the date as header
      console.log('Adding or updating date column...');
      const columnInfo = await GoogleSheetsService.addDateColumn(sheetName, formattedDate);
      console.log('Column info:', columnInfo);

      // Check if we're in simulation mode
      if (columnInfo.simulated) {
        console.log('Running in simulation mode');

        // In simulation mode, we'll just show what would happen
        const attendanceSummary = students.map(student =>
          `${student.name}: ${student.attendanceStatus}`
        ).join(', ');

        // Show different messages based on sign-in status
        if (!isSignedIn) {
          setStatus({
            message: `DEMO MODE: Sign in with Google to save attendance. For now, attendance for ${formatDateForDisplay(selectedDate)} would be recorded as: ${attendanceSummary}`,
            type: 'success'
          });
        } else {
          setStatus({
            message: `DEMO MODE: Your Google account doesn't have permission to write to this sheet. Attendance for ${formatDateForDisplay(selectedDate)} would be recorded as: ${attendanceSummary}`,
            type: 'success'
          });
        }

        // Add a note about the simulation
        console.log('Running in simulation mode. In a production app with proper OAuth2 authentication and permissions, the attendance would be saved to the Google Sheet.');
      } else {
        console.log('Running in real mode, updating attendance for each student...');

        // 2. Update attendance for each student
        const updatePromises = students.map(student => {
          console.log(`Updating attendance for ${student.name} (${student.id}) to ${student.attendanceStatus}`);
          return GoogleSheetsService.updateAttendanceByStudentId(
            sheetName,
            student.id,
            columnInfo.columnLetter,
            student.attendanceStatus
          );
        });

        const results = await Promise.all(updatePromises);
        console.log('Update results:', results);

        // Check if any updates were simulated
        const anySimulated = results.some(result => result.simulated);

        if (anySimulated) {
          setStatus({
            message: `PARTIAL UPDATE: Some attendance records for ${formatDateForDisplay(selectedDate)} were saved, but others could not be updated due to permission issues.`,
            type: 'success'
          });
        } else {
          // Show different message based on whether we updated an existing column or created a new one
          if (columnInfo.isExisting) {
            setStatus({
              message: `Attendance for ${formatDateForDisplay(selectedDate)} updated successfully! Existing column was updated.`,
              type: 'success'
            });
          } else {
            setStatus({
              message: `Attendance for ${formatDateForDisplay(selectedDate)} recorded successfully! New column was created.`,
              type: 'success'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error recording attendance:', error);

      // Provide a more user-friendly error message
      let errorMessage = 'Failed to record attendance. ';

      if (error.message && error.message.includes('Authentication error')) {
        errorMessage += 'Please sign in with your Google account to write to Google Sheets.';
      } else if (error.message && error.message.includes('Permission denied')) {
        errorMessage += 'Make sure your Google Sheet is shared with edit permissions.';
      } else if (error.message && error.message.includes('Google Sheets API not loaded')) {
        errorMessage += 'The Google Sheets API failed to load. Please refresh the page and try again.';
      } else {
        errorMessage += error.message || 'Please check your API key and permissions.';
      }

      setStatus({
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
      // Scroll to top to show the status message
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="sheet-data-input" ref={topRef}>
      <h2 style={{ fontWeight: 700, color: '#1a237e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Record Attendance</h2>
      {status.message && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      <div className="date-selector">
        <label htmlFor="attendanceDate">Attendance Date:</label>
        <div className="date-input-container">
          <DatePicker
            id="attendanceDate"
            selected={selectedDate}
            onChange={async (date) => {
              console.log('Date changed to:', date);
              setSelectedDate(date);
              // Reload student data with attendance status for the new date immediately
              await fetchStudents();
              console.log('Finished reloading student data for new date');
            }}
            disabled={loading}
            dateFormat="MMMM d, yyyy"
            className="custom-datepicker"
            calendarClassName="custom-calendar"
            wrapperClassName="datepicker-wrapper"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            fixedHeight
            popperClassName="datepicker-popper"
            popperPlacement="auto"
            popperContainer={({ children }) => (
              <div className="calendar-portal">{children}</div>
            )}
            popperProps={{
              positionFixed: true,
              strategy: "fixed"
            }}
            popperModifiers={[
              {
                name: "preventOverflow",
                options: {
                  boundary: 'viewport',
                  padding: 20,
                  altAxis: true,
                },
              },
              {
                name: "offset",
                options: {
                  offset: [0, 10],
                },
              },
              {
                name: "flip",
                options: {
                  fallbackPlacements: ['top', 'bottom', 'right', 'left'],
                },
              },
            ]}
            shouldCloseOnSelect={true}
            onCalendarClose={() => {
              // Force focus away from the input to prevent immediate reopening
              document.activeElement.blur();
            }}
          />
        </div>
        {existingDates.some(date => date === formatDateForSheet(selectedDate)) && (
          <div className="date-exists-indicator">
            (Existing records will be updated)
          </div>
        )}
      </div>
      {/* Attendance buttons moved to the form */}
      {loadingStudents ? (
        <div className="loading-container">
          <div className="loading-spinner large"></div>
          <p>Loading student data...</p>
        </div>
      ) : studentError ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Students</h3>
          <p>{studentError}</p>
          <button onClick={fetchStudents} className="refresh-button">
            <span className="refresh-icon">↻</span> Try Again
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="no-data">
          <div className="no-data-icon">📋</div>
          <h3>No Students Found</h3>
          <p>Make sure your Google Sheet contains student data with proper headers.</p>
          <p>The app will try to identify columns based on headers like "Name", "ID", "Class", etc.</p>
          <p>If your sheet doesn't have headers, the app will use the first row as headers.</p>
          <button onClick={fetchStudents} className="refresh-button">
            <span className="refresh-icon">↻</span> Refresh Student Data
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '100%' }}>
          <div className="button-container">
            <button
              type="button"
              onClick={openAttendanceModal}
              disabled={loading}
              className="take-attendance-button sequential-button"
            >
              <span className="button-icon">👥</span> Take Attendance Sequentially
            </button>
          </div>

          <div className="students-list full-width" style={{ width: '100%', maxWidth: '100%' }}>
            {/* Table View for Desktop */}
            <div className="students-list-table full-width" style={{ width: '100%', maxWidth: '100%' }}>
              <div className="attendance-grid">
                {/* Header Row */}
                <div className="attendance-row header-row">
                  <div className="attendance-cell header-cell id-cell">
                    <button
                      className={`filter-button ${activeFilter === 'id' ? 'active' : ''}`}
                      title="Filter by ID"
                      onClick={(e) => handleFilterClick(e, 'id')}
                      type="button"
                    >
                      <span>ID</span>
                    </button>
                  </div>
                  <div className="attendance-cell header-cell name-cell">
                    <button
                      className={`filter-button ${activeFilter === 'name' ? 'active' : ''}`}
                      title="Filter by Name"
                      onClick={(e) => handleFilterClick(e, 'name')}
                      type="button"
                    >
                      <span>Name</span>
                    </button>
                  </div>
                  <div className="attendance-cell header-cell class-cell">
                    <button
                      className={`filter-button ${activeFilter === 'class' ? 'active' : ''}`}
                      title="Filter by Class"
                      onClick={(e) => handleFilterClick(e, 'class')}
                      type="button"
                    >
                      <span>Class</span>
                    </button>
                  </div>
                  <div className="attendance-cell header-cell school-cell">
                    <button
                      className={`filter-button ${activeFilter === 'school' ? 'active' : ''}`}
                      title="Filter by School"
                      onClick={(e) => handleFilterClick(e, 'school')}
                      type="button"
                    >
                      <span>School</span>
                    </button>
                  </div>
                  <div className="
                   header-cell attendance-cell">
                    <button
                      className={`filter-button ${activeFilter === 'attendanceStatus' ? 'active' : ''}`}
                      title="Filter by Attendance"
                      onClick={(e) => handleFilterClick(e, 'attendanceStatus')}
                      type="button"
                    >
                      <span>Attendance</span>
                    </button>
                  </div>
                </div>

                {/* Filter Dropdown */}
                {activeFilter && (
                  <div className="filter-dropdown" style={{
                    position: 'fixed',
                    top: (() => {
                      const headerCell = document.querySelector(`.${activeFilter === 'id' ? 'id' :
                                                                  activeFilter === 'name' ? 'name' :
                                                                  activeFilter === 'class' ? 'class' :
                                                                  activeFilter === 'school' ? 'school' : 'attendance'}-cell.header-cell`);
                      if (headerCell) {
                        const rect = headerCell.getBoundingClientRect();
                        return `${rect.bottom}px`;
                      }
                      return '40px';
                    })(),
                    left: (() => {
                      const headerCell = document.querySelector(`.${activeFilter === 'id' ? 'id' :
                                                                  activeFilter === 'name' ? 'name' :
                                                                  activeFilter === 'class' ? 'class' :
                                                                  activeFilter === 'school' ? 'school' : 'attendance'}-cell.header-cell`);
                      if (headerCell) {
                        const rect = headerCell.getBoundingClientRect();
                        return `${rect.left}px`;
                      }
                      return activeFilter === 'id' ? '0' :
                             activeFilter === 'name' ? '60px' :
                             activeFilter === 'class' ? '240px' :
                             activeFilter === 'school' ? '390px' : '540px';
                    })(),
                    zIndex: 1000,
                    width: (() => {
                      const headerCell = document.querySelector(`.${activeFilter === 'id' ? 'id' :
                                                                  activeFilter === 'name' ? 'name' :
                                                                  activeFilter === 'class' ? 'class' :
                                                                  activeFilter === 'school' ? 'school' : 'attendance'}-cell.header-cell`);
                      if (headerCell) {
                        const rect = headerCell.getBoundingClientRect();
                        return `${rect.width}px`;
                      }
                      return activeFilter === 'id' ? '60px' :
                             activeFilter === 'name' ? '180px' :
                             activeFilter === 'class' ? '150px' :
                             activeFilter === 'school' ? '150px' : '150px';
                    })()
                  }}>
                    <div className="filter-dropdown-header">
                      <span>Filter: {activeFilter === 'id' ? 'StudentID' :
                             activeFilter === 'name' ? 'StudentName' :
                             activeFilter === 'class' ? 'Class' :
                             activeFilter === 'school' ? 'SchoolName' : 'Attendance'}</span>
                      <button
                        type="button"
                        className="clear-filter-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          // Clear filter for this field
                          const newFilters = {...filters};
                          delete newFilters[activeFilter];
                          setFilters(newFilters);
                          setActiveFilter(null);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                    <div className="filter-dropdown-content">
                      {/* Get unique values for the selected field */}
                      {Array.from(new Set(students.map(student => student[activeFilter] || 'N/A')))
                        .sort((a, b) => {
                          // Sort numerically if possible, otherwise alphabetically
                          const numA = Number(a);
                          const numB = Number(b);
                          if (!isNaN(numA) && !isNaN(numB)) {
                            return numA - numB;
                          }
                          return String(a).localeCompare(String(b));
                        })
                        .map(value => (
                          <label key={value} className="filter-checkbox-label">
                            <input
                              type="checkbox"
                              checked={filters[activeFilter] === value}
                              onChange={(e) => {
                                // Update filters
                                setFilters({
                                  ...filters,
                                  [activeFilter]: e.target.checked ? value : null
                                });
                                // Close the dropdown after selection
                                if (e.target.checked) {
                                  setTimeout(() => setActiveFilter(null), 300);
                                }
                              }}
                            />
                            <span className="filter-value-text">{value}</span>
                          </label>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Data Rows */}
                {getCurrentPageStudents().map(student => (
                  <div key={`grid-${student.id}`} className="attendance-row data-row">
                    <div className="attendance-cell id-cell">{student.id}</div>
                    <div className="attendance-cell name-cell">{student.name || 'Unknown'}</div>
                    <div className="attendance-cell class-cell">{student.class || 'N/A'}</div>
                    <div className="attendance-cell school-cell">{student.school || 'N/A'}</div>
                    <div className="attendance-cell attendance-cell">
                      <div className="status-buttons">
                        <button
                          type="button"
                          className={`status-button present ${student.attendanceStatus === 'Present' ? 'selected' : ''}`}
                          onClick={() => handleAttendanceChange(student.id, 'Present')}
                          disabled={loading}
                        >
                          <span className="status-icon">✓</span>
                        </button>

                        <button
                          type="button"
                          className={`status-button absent ${student.attendanceStatus === 'Absent' ? 'selected' : ''}`}
                          onClick={() => handleAttendanceChange(student.id, 'Absent')}
                          disabled={loading}
                        >
                          <span className="status-icon">✗</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card View for Mobile */}
            {getCurrentPageStudents().map(student => (
              <div key={`card-${student.id}`} className="attendance-card">
                <div className="attendance-card-header">
                  <div className="attendance-card-id">{student.id}</div>
                  <div className="attendance-card-name">{student.name || 'Unknown'}</div>
                </div>

                <div className="attendance-card-details">
                  <div className="attendance-card-info">
                    <div className="attendance-card-field">
                      <span className="attendance-card-label">Class:</span>
                      <span className="attendance-card-value attendance-card-class">{student.class || 'N/A'}</span>
                    </div>

                    <div className="attendance-card-field">
                      <span className="attendance-card-label">School:</span>
                      <span className="attendance-card-value attendance-card-school">{student.school || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="attendance-card-status">
                    <div className="status-radio-group">
                      <label className={`status-radio-label status-present ${student.attendanceStatus === 'Present' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={`status-card-${student.id}`}
                          value="Present"
                          checked={student.attendanceStatus === 'Present'}
                          onChange={() => handleAttendanceChange(student.id, 'Present')}
                          disabled={loading}
                        />
                        <span>✓</span>
                      </label>

                      <label className={`status-radio-label status-absent ${student.attendanceStatus === 'Absent' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={`status-card-${student.id}`}
                          value="Absent"
                          checked={student.attendanceStatus === 'Absent'}
                          onChange={() => handleAttendanceChange(student.id, 'Absent')}
                          disabled={loading}
                        />
                        <span>✗</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {getCurrentPageStudents().length > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0} to {Math.min(currentPage * recordsPerPage, students.length)} of {students.length} records
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

          <div className="attendance-buttons">
            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span> Recording Attendance...
                </>
              ) : (
                <>
                  <span className="button-icon">✓</span> Save Attendance for All Students
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Sequential Attendance Modal */}
      <AttendanceModal
        students={students}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleModalComplete}
        selectedDate={formatDateForDisplay(selectedDate)}
      />
    </div>
  );
}

export default SheetDataInput;
