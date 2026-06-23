import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
const pdfParse = require('pdf-parse');
import { generateEmbedding } from '@/lib/embeddings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { emitEvent } from '@/lib/workflows/engine';

// Basic chunking function (splits by roughly 1000 chars, preferring newlines)
function chunkText(text: string, maxChunkSize = 1000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by paragraphs to try and keep context together
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const para of paragraphs) {
    if ((currentChunk.length + para.length) > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += para + '\n\n';
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload PDF, TXT, or MD.' }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Could not extract any text from the file.' }, { status: 400 });
    }

    // 1. Save Document metadata
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        userId: session.user.id,
      }
    });

    // 2. Chunk text
    const chunks = chunkText(extractedText);

    // 3. Save chunks with embeddings
    const chunkCreates = [];
    for (const chunkContent of chunks) {
      const embeddingArray = await generateEmbedding(chunkContent);
      chunkCreates.push({
        documentId: document.id,
        content: chunkContent,
        embedding: embeddingArray ? JSON.stringify(embeddingArray) : null
      });
    }

    await prisma.documentChunk.createMany({
      data: chunkCreates
    });

    emitEvent(session.user.id, 'DOCUMENT_UPLOADED', {
      documentId: document.id,
      fileName: document.fileName
    });

    return NextResponse.json({ 
      success: true, 
      document,
      chunksCreated: chunks.length 
    });

  } catch (error: any) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: error.message || 'Failed to process file' }, { status: 500 });
  }
}
