import mongoose from 'mongoose';
import { User } from '../features/users/user.model';
import { connectDB, disconnectDB } from '../shared/config/db';

/**
 * Script to promote a user to admin role.
 * Usage: npm run seed:admin
 * 
 * Creates a default admin user or promotes an existing user.
 */
async function makeAdmin(): Promise<void> {
  await connectDB();

  const email = process.argv[2] || 'admin@test.com';

  let user = await User.findOne({ email });
  if (!user) {
    console.log(`No user found with email ${email}. Creating admin user...`);
    user = await User.create({
      name: 'Admin',
      email,
      password: 'admin123',
      role: 'admin',
    });
    console.log(`✅ Admin user created: ${email} / admin123`);
  } else {
    user.role = 'admin';
    await user.save();
    console.log(`✅ User ${email} promoted to admin`);
  }

  await disconnectDB();
  process.exit(0);
}

makeAdmin().catch((err) => {
  console.error('Failed to make admin:', err);
  process.exit(1);
});
