import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors.js';

function getBorrowingLimit(membershipType) {
  const limits = {
    Student: 5,
    Faculty: 10,
    Public: 3
  };
  return limits[membershipType] || 3;
}

function generateMemberCode() {
  const year = new Date().getUTCFullYear();
  const timestamp = Date.now().toString().slice(-8);
  return `MEM${year}${timestamp}`;
}

export async function register(data) {
  const { username, email, password, firstName, lastName, membershipType } = data;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email }
      ]
    }
  });

  if (existing) {
    throw new BadRequestError('Username or email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const borrowingLimit = getBorrowingLimit(membershipType);
  const memberCode = generateMemberCode();
  const membershipDate = new Date();
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'Member',
      status: 'Active',
      member: {
        create: {
          memberCode,
          membershipType,
          membershipDate,
          expiryDate,
          borrowingLimit
        }
      }
    },
    include: {
      member: true
    }
  });

  delete user.passwordHash;
  return { user };
}

export async function login(credentials) {
  const { usernameOrEmail, password } = credentials;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.status !== 'Active') {
    throw new UnauthorizedError('Account is not active');
  }

  await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() }
  });

  const token = jwt.sign(
    {
      userId: user.userId.toString(),
      role: user.role
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: 'lmr-api',
      audience: 'lmr-web'
    }
  );

  return {
    accessToken: token,
    user: {
      userId: user.userId.toString(),
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    }
  };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { userId: BigInt(userId) },
    include: {
      member: true,
      librarian: true,
      admin: true
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  delete user.passwordHash;
  return user;
}
