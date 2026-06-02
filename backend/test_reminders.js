const { checkAndSendLessonReminders } = require('./src/services/lesson-reminder-scheduler');

console.log('🧪 Testing lesson reminders manually...');
checkAndSendLessonReminders()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
