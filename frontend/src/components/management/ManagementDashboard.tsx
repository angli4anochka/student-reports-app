import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useManagement } from '../../hooks/useManagement';
import { DashboardHeader } from './DashboardHeader';
import { TodayLessons } from './TodayLessons';
import { NextStudentCard } from './NextStudentCard';
import { ReportsCard } from './ReportsCard';
import { NotesSection } from './NotesSection';
import { HomeworkModal } from './HomeworkModal';
import { ImageUploadModal } from './ImageUploadModal';
import AddStudentModal from '../AddStudentModal';
import AdminDashboard from '../AdminDashboard';

export const ManagementDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    // Data
    students,
    groups,
    todaySlots,
    allLessons,

    // UI State
    loading,
    selectedDate,
    showAddStudent,
    setShowAddStudent,
    showHomeworkModal,
    setShowHomeworkModal,
    selectedSlot,
    homeworkData,
    setHomeworkData,

    // Checkbox State
    slotCompleted,
    slotPaid,

    // Notes
    notes,
    setNotes,

    // Telegram
    sendingToTelegram,
    showImageModal,
    uploadingImage,

    // Computed
    dashboardStats,

    // Methods
    loadAll,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    toggleCompleted,
    handleOpenHomework,
    handleSaveHomework,
    handleSendToTelegram,
    handleSendImage,
    handleSkipImage,
    findLessonsForSlot,
  } = useManagement();

  const firstName = user?.fullName?.split(' ')[1] || user?.fullName?.split(' ')[0] || 'Учитель';

  // Show admin dashboard for admin users
  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT + CENTER (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Greeting card */}
          <DashboardHeader
            firstName={firstName}
            selectedDate={selectedDate}
            activeToday={dashboardStats.activeToday}
            dayEarnings={dashboardStats.dayEarnings}
            onPreviousDay={goToPreviousDay}
            onNextDay={goToNextDay}
            onToday={goToToday}
            onAddStudent={() => setShowAddStudent(true)}
          />

          {/* Two cards row: Today's lessons | Reports */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              {/* Today's lessons */}
              <TodayLessons
                todaySlots={todaySlots}
                allLessons={allLessons}
                selectedDate={selectedDate}
                slotCompleted={slotCompleted}
                slotPaid={slotPaid}
                onToggleCompleted={toggleCompleted}
                onOpenHomework={handleOpenHomework}
                findLessonsForSlot={findLessonsForSlot}
              />

              {/* Next Student */}
              <NextStudentCard
                todaySlots={todaySlots}
                allLessons={allLessons}
                selectedDate={selectedDate}
                findLessonsForSlot={findLessonsForSlot}
              />
            </div>

            {/* Reports */}
            <ReportsCard
              missedToday={dashboardStats.missedToday}
              homeworkNotChecked={dashboardStats.homeworkNotChecked}
            />
          </div>
        </div>

        {/* RIGHT column (1 col): Notes */}
        <NotesSection
          notes={notes}
          onNotesChange={setNotes}
        />
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        onStudentAdded={loadAll}
        groups={groups}
      />

      {/* Homework Modal */}
      <HomeworkModal
        isOpen={showHomeworkModal}
        slot={selectedSlot}
        selectedDate={selectedDate}
        homeworkData={homeworkData}
        sendingToTelegram={sendingToTelegram}
        onClose={() => setShowHomeworkModal(false)}
        onDataChange={setHomeworkData}
        onSave={handleSaveHomework}
        onSendToTelegram={handleSendToTelegram}
      />

      {/* Image Upload Modal */}
      {showImageModal && (
        <ImageUploadModal
          onSendImage={handleSendImage}
          onSkip={handleSkipImage}
          uploading={uploadingImage}
        />
      )}
    </div>
  );
};