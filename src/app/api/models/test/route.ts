import { NextResponse } from 'next/server';
import ollama from 'ollama';

export async function POST(request: Request) {
  try {
    const { modelName } = await request.json();

    if (!modelName) {
      return NextResponse.json({ error: 'Missing modelName' }, { status: 400 });
    }

    // A simple ping test
    const response = await ollama.chat({
      model: modelName,
      messages: [{ role: 'user', content: 'Say OK' }],
      stream: false
    });

    if (response && response.message) {
      return NextResponse.json({ success: true, message: response.message.content });
    } else {
      return NextResponse.json({ error: 'Model did not respond correctly' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Failed to test model:', error);
    return NextResponse.json({ error: error.message || 'Failed to communicate with model' }, { status: 500 });
  }
}
