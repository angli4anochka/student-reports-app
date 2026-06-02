// Generate bcrypt hash for password
const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'demo123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  console.log('\nPassword:', password);
  console.log('Bcrypt hash:', hash);
  console.log('\nSQL to insert user:');
  console.log(`
INSERT INTO users (id, email, password, "fullName", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'teacher@demo.com',
  '${hash}',
  'Demo Teacher',
  'TEACHER',
  NOW(),
  NOW()
);
  `);
});
