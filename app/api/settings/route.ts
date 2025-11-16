import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { settingsSchema } from '@/lib/validators';
import { handleApiError, AuthenticationError, ValidationError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError('You must be signed in to view settings');
    }

    // Get or create user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          emailNotifications: true,
          theme: 'system',
        },
      });
    }

    return NextResponse.json({
      emailNotifications: settings.emailNotifications,
      theme: settings.theme,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError('You must be signed in to save settings');
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body');
    }

    // Validate input
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      throw new ValidationError('Invalid settings data', errors);
    }

    const { emailNotifications, theme } = parsed.data;

    // Upsert user settings (create if doesn't exist, update if exists)
    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        emailNotifications,
        theme,
      },
      create: {
        userId: session.user.id,
        emailNotifications,
        theme,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: {
        emailNotifications: settings.emailNotifications,
        theme: settings.theme,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

