import React, { useEffect, useState } from 'react';

interface Lesson {
  id: string;
  date: string;
  time?: string;
  notificationDate?: string;
  topic: string;
  lessonPlan?: string;
  group?: {
    name: string;
  };
}

interface LessonNotificationsProps {
  lessons: Lesson[];
}

const LessonNotifications: React.FC<LessonNotificationsProps> = ({ lessons }) => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Lesson | null>(null);
  const [notifiedLessons, setNotifiedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check initial permission state
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true);
      } else if (Notification.permission === 'denied') {
        setPermissionGranted(false);
      }
    }
  }, []);

  useEffect(() => {
    console.log('[LessonNotifications] Permission granted:', permissionGranted);
    console.log('[LessonNotifications] Total lessons:', lessons.length);

    if (!permissionGranted) return;

    const checkReminders = () => {
      const now = new Date();
      const todayStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      console.log('[LessonNotifications] Checking reminders...');
      console.log('  Current date:', todayStr);
      console.log('  Current time:', currentTime);
      console.log('  Lessons to check:', lessons.length);

      // Find lessons with notification date = today, with time and lesson plan
      const todaysLessons = lessons.filter(
        (lesson) => {
          // Use notificationDate if provided, otherwise fall back to date
          const dateToCheck = lesson.notificationDate || lesson.date;
          console.log(`  Lesson "${lesson.topic}": notificationDate=${lesson.notificationDate}, date=${lesson.date}, dateToCheck=${dateToCheck}, time=${lesson.time}, hasLessonPlan=${!!lesson.lessonPlan}`);
          return dateToCheck === todayStr && lesson.time && lesson.lessonPlan;
        }
      );

      console.log('  Today\'s lessons with notifications:', todaysLessons.length);

      todaysLessons.forEach((lesson) => {
        if (!lesson.time || !lesson.lessonPlan) return;

        console.log(`  Checking lesson "${lesson.topic}": time=${lesson.time}, currentTime=${currentTime}, alreadyNotified=${notifiedLessons.has(lesson.id)}`);

        // Check if we already notified for this lesson
        if (notifiedLessons.has(lesson.id)) return;

        // Show reminder at lesson start time
        if (lesson.time === currentTime) {
          console.log(`  ✅ SHOWING REMINDER for lesson "${lesson.topic}"`);
          showReminder(lesson);
          setNotifiedLessons(prev => new Set(prev).add(lesson.id));
        }
      });
    };

    // Check every 30 seconds
    const interval = setInterval(checkReminders, 30000);
    checkReminders(); // Check immediately

    return () => clearInterval(interval);
  }, [lessons, permissionGranted, notifiedLessons]);

  const showReminder = (lesson: Lesson) => {
    console.log('[LessonNotifications] showReminder called for:', lesson);

    // Show browser notification
    try {
      // Truncate lesson plan to fit in notification (browser notifications have character limits)
      const lessonPlanPreview = lesson.lessonPlan
        ? (lesson.lessonPlan.length > 100
            ? lesson.lessonPlan.substring(0, 100) + '...'
            : lesson.lessonPlan)
        : 'Структура урока не указана';

      const notificationBody = lesson.group?.name
        ? `${lesson.group.name}\n\n${lessonPlanPreview}`
        : lessonPlanPreview;

      const notification = new Notification(`${lesson.date} в ${lesson.time} - ${lesson.topic}`, {
        body: notificationBody,
        icon: '/favicon.ico',
        tag: `lesson-${lesson.id}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        notification.close();
        setCurrentReminder(lesson);
      };

      console.log('[LessonNotifications] Browser notification created');
    } catch (error) {
      console.error('[LessonNotifications] Error creating browser notification:', error);
    }

    // Show in-app reminder
    setCurrentReminder(lesson);
    console.log('[LessonNotifications] In-app reminder set');
  };

  const closeReminder = () => {
    setCurrentReminder(null);
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
    }
  };

  if (Notification.permission === 'default') {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#FFA726',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          maxWidth: '300px',
          zIndex: 1000
        }}
      >
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
          Разрешите уведомления
        </p>
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
          Чтобы получать напоминания о уроках, разрешите уведомления в браузере.
        </p>
        <button
          onClick={requestPermission}
          style={{
            backgroundColor: 'white',
            color: '#FFA726',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Разрешить
        </button>
      </div>
    );
  }

  if (!currentReminder) return null;

  // Function to convert URLs in text to clickable links
  const linkifyText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#90CAF9',
              textDecoration: 'underline',
              wordBreak: 'break-all'
            }}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#2196F3',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 1000,
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>
            {currentReminder.topic}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
            {currentReminder.date} в {currentReminder.time}
          </p>
        </div>
        <button
          onClick={closeReminder}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {currentReminder.group && (
        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>
          Группа: {currentReminder.group.name}
        </p>
      )}

      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.15)',
          padding: '1rem',
          borderRadius: '6px',
          marginTop: '1rem'
        }}
      >
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1rem' }}>
          Структура урока:
        </p>
        <div style={{ fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
          {linkifyText(currentReminder.lessonPlan || 'Структура урока не указана')}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(550px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default LessonNotifications;
