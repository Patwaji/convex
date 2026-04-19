import mongoose from 'mongoose';
import { User } from '../src/features/users/user.model';
import { connectDB } from '../src/shared/config/db';

async function seedAdmin() {
  await connectDB();

  const existingAdmin = await User.findOne({ email: 'convexadmin@convex.com' });
  
  if (existingAdmin) {
    console.log('Admin user already exists');
    existingAdmin.role = 'admin';
    existingAdmin.name = 'convexadmin';
    await existingAdmin.save();
    console.log('Updated existing user to admin');
  } else {
    await User.create({
      name: 'convexadmin',
      email: 'convexadmin@convex.com',
      password: 'Convex_3000',
      role: 'admin',
    });
    console.log('Created admin user: convexadmin@convex.com / Convex_3000');
  }

  await mongoose.disconnect();
  console.log('Done');
}

seedAdmin().catch(console.error);