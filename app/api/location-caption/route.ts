import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');

    if (!location) {
      return NextResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder') {
      // Return a fallback caption if OpenAI is not configured
      return NextResponse.json({
        caption: `${location} – a beautiful destination for your eco-friendly journey.`,
      });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a travel guide expert. Generate a short, one-line caption (max 100 characters) describing a location for an eco-friendly travel app. Focus on what makes the location unique, interesting, or notable. Keep it concise and engaging.',
          },
          {
            role: 'user',
            content: `Generate a short one-line caption for "${location}". Format: "[Location Name] – [description]". Example: "Texas – known for its vibrant cities and vast landscapes."`,
          },
        ],
        max_tokens: 60,
        temperature: 0.7,
        timeout: 10000, // 10 second timeout
      });

      const caption = completion.choices[0]?.message?.content?.trim() || `${location} – a beautiful destination for your eco-friendly journey.`;

      // Clean up caption if it doesn't start with location name
      let finalCaption = caption;
      if (!caption.toLowerCase().startsWith(location.toLowerCase())) {
        finalCaption = `${location} – ${caption.replace(/^[^–-]+[–-]\s*/i, '')}`;
      }

      return NextResponse.json({ caption: finalCaption });
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      
      // Return fallback caption on error
      return NextResponse.json({
        caption: `${location} – a beautiful destination for your eco-friendly journey.`,
      });
    }
  } catch (error: any) {
    console.error('Location caption API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate caption' },
      { status: 500 }
    );
  }
}

