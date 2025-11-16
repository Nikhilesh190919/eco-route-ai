import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signupSchema } from '@/lib/validators';
import bcrypt from 'bcryptjs';
import { handleApiError, ValidationError, AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const parsed = signupSchema.safeParse(body);
    
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      throw new ValidationError('Invalid signup data', errors);
    }

    const { email, password, name } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'DUPLICATE_EMAIL');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json(
      { message: 'User created successfully', user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return handleApiError(error);
  }
}

