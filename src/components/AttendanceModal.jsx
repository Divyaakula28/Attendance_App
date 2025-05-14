import { useState, useEffect } from 'react';
import '../styles/AttendanceModal.css';
import PeacockFeatherBackground from './PeacockFeatherBackground';

function AttendanceModal({
  students,
  isOpen,
  onClose,
  onComplete,
  selectedDate
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attendanceData, setAttendanceData] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [summary, setSummary] = useState({ present: 0, absent: 0 });

  // Initialize attendance data when students prop changes
  useEffect(() => {
    if (students && students.length > 0) {
      // Use the existing attendance status from the students prop
      setAttendanceData(students);
      setCurrentIndex(0);
      setIsCompleted(false);

      // Calculate initial summary based on existing attendance data
      const initialSummary = students.reduce((summary, student) => {
        if (student.attendanceStatus === 'Present') {
          summary.present += 1;
        } else if (student.attendanceStatus === 'Absent') {
          summary.absent += 1;
        }
        return summary;
      }, { present: 0, absent: 0 });

      setSummary(initialSummary);
    }
  }, [students]);

  // Current student being displayed
  const currentStudent = attendanceData[currentIndex];

  // Handle marking a student as present
  const markPresent = () => {
    updateAttendance('Present');
  };

  // Handle marking a student as absent
  const markAbsent = () => {
    updateAttendance('Absent');
  };

  // Update attendance and move to next student
  const updateAttendance = (status) => {
    // Update the attendance status for the current student
    const updatedData = [...attendanceData];
    updatedData[currentIndex] = {
      ...updatedData[currentIndex],
      attendanceStatus: status
    };
    setAttendanceData(updatedData);

    // Update summary
    setSummary(prev => ({
      present: status === 'Present' ? prev.present + 1 : prev.present,
      absent: status === 'Absent' ? prev.absent + 1 : prev.absent
    }));

    // Move to the next student or complete if this was the last one
    if (currentIndex < attendanceData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsCompleted(true);
    }
  };

  // Handle completion of attendance taking
  const handleComplete = () => {
    onComplete(attendanceData);
    onClose();
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // If no students, show a message
  if (!students || students.length === 0) {
    return (
      <div className="attendance-modal-overlay">
        <div className="attendance-modal">
          {/* Peacock Feather Background */}
          <PeacockFeatherBackground />

          <h2>No Students Found</h2>
          <p>There are no students to take attendance for.</p>
          <button onClick={onClose} className="modal-button">Close</button>
        </div>
      </div>
    );
  }

  // If attendance is completed, show summary
  if (isCompleted) {
    // Calculate percentages
    const presentPercent = Math.round((summary.present / attendanceData.length) * 100);
    const absentPercent = Math.round((summary.absent / attendanceData.length) * 100);

    return (
      <div className="attendance-modal-overlay">
        <div className="attendance-modal">
          {/* Peacock Feather Background */}
          <PeacockFeatherBackground />

          <div className="modal-header">
            <h2>Attendance Complete!</h2>
            <div className="progress-indicator">
              {selectedDate}
            </div>
          </div>

          <div className="attendance-summary">
            <p>Date: <span>{selectedDate}</span></p>
            <p>Total Students: <span>{attendanceData.length}</span></p>
            <p>Present: <span className="status-present">{summary.present} ({presentPercent}%)</span></p>
            <p>Absent: <span className="status-absent">{summary.absent} ({absentPercent}%)</span></p>
          </div>

          <div className="modal-buttons">
            <button onClick={handleComplete} className="modal-button primary">Save Attendance</button>
            <button onClick={onClose} className="modal-button secondary">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // Main attendance taking view
  return (
    <div className="attendance-modal-overlay">
      <div className="attendance-modal">
        {/* Peacock Feather Background */}
        <PeacockFeatherBackground />

        <div className="modal-header">
          <h2>Take Attendance</h2>
          <div className="progress-indicator">
            Student {currentIndex + 1} of {attendanceData.length}
          </div>
        </div>

        <div className="student-card">
          <h3>{currentStudent.name}</h3>
          <div className="student-details">
            <p><strong>ID:</strong> {currentStudent.id}</p>
            <p><strong>Class:</strong> {currentStudent.class}</p>
            <p><strong>School:</strong> {currentStudent.school}</p>
            <p><strong>Status:</strong> <span className={currentStudent.attendanceStatus === 'Present' ? 'status-present' : 'status-absent'}>{currentStudent.attendanceStatus}</span></p>
          </div>
        </div>

        <div className="attendance-buttons">
          <button
            onClick={markPresent}
            className="attendance-button present"
          >
            Present
          </button>
          <button
            onClick={markAbsent}
            className="attendance-button absent"
          >
            Absent
          </button>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="modal-button secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceModal;
