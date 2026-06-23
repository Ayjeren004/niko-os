import { NextResponse } from 'next/server';
import ollama from 'ollama';

export async function GET() {
  try {
    const list = await ollama.list();
    return NextResponse.json({ models: list.models });
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    return NextResponse.json({ error: 'Failed to communicate with Ollama' }, { status: 500 });
  }
}
