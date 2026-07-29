import bcrypt from 'bcryptjs';
import { db } from './db';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL || 'admin@lindafashion.cz',
    password: process.env.ADMIN_PASSWORD || 'adminpassword123',
  };
}

export async function verifyAdminCredentials(email: string, pass: string): Promise<boolean> {
  const admin = await getAdminCredentials();
  return email.toLowerCase() === admin.email.toLowerCase() && pass === admin.password;
}
