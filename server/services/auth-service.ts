import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import type { InsertUser, User } from '@shared/schema';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(username: string, password: string, email?: string): Promise<User> {
  // Check if username already exists
  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Check if email already exists
  if (email) {
    const existingEmailUser = await storage.getUserByEmail(email);
    if (existingEmailUser) {
      throw new Error('Email already in use');
    }
  }

  // Hash password and create user
  const hashedPassword = await hashPassword(password);
  const user = await storage.createUser({
    username,
    password: hashedPassword,
    email,
  });

  return user;
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await storage.getUserByUsername(username);
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.password);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash and update new password
  const hashedPassword = await hashPassword(newPassword);
  await storage.updateUserPassword(userId, hashedPassword);
}

// Helper to get user without password field
export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...sanitized } = user;
  return sanitized;
}
