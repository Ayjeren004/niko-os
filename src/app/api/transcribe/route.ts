import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { WaveFile } from 'wavefile';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Tell fluent-ffmpeg where to find the static binary
// Next.js bundles ffmpegStatic incorrectly during the build, so we manually resolve the path
const manualFfmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
ffmpeg.setFfmpegPath(manualFfmpegPath);

// Keep the model pipeline in memory for fast subsequent requests
let transcriber: any = null;

async function getTranscriber() {
  if (!transcriber) {
    // Dynamic import prevents Next.js edge runtime issues during build
    const TransformersApi = await import('@xenova/transformers');
    
    // Instantiate pipeline (downloads 'Xenova/whisper-base' on first run for multilingual support)
    transcriber = await TransformersApi.pipeline(
      'automatic-speech-recognition', 
      'Xenova/whisper-base'
    );
  }
  return transcriber;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let tmpInputPath = '';
  let tmpOutputPath = '';

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // 1. Save raw audio (e.g. webm) to tmp directory
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const tmpDir = os.tmpdir();
    tmpInputPath = path.join(tmpDir, `input-${Date.now()}.webm`);
    tmpOutputPath = path.join(tmpDir, `output-${Date.now()}.wav`);

    await fs.writeFile(tmpInputPath, buffer);

    // 2. Convert to 16kHz mono WAV using local ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tmpInputPath)
        .outputOptions([
          '-ar 16000', // Whisper needs 16kHz
          '-ac 1',     // Mono channel
          '-f wav'
        ])
        .save(tmpOutputPath)
        .on('end', resolve)
        .on('error', reject);
    });

    // 3. Read the parsed WAV file
    const wavBuffer = await fs.readFile(tmpOutputPath);

    // 4. Extract raw PCM Float32 samples
    const wav = new WaveFile(wavBuffer);
    wav.toBitDepth('32f'); // Convert bit depth
    const samples = wav.getSamples();
    
    let audioData: Float32Array;
    if (Array.isArray(samples)) {
      audioData = new Float32Array(samples[0]); // Take first channel if stereo
    } else {
      audioData = new Float32Array(samples as any);
    }

    // 5. Run Local Whisper transcription with timeout
    const transcribeFn = await getTranscriber();
    
    const transcribePromise = transcribeFn(audioData);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Transcription timeout')), 20000)
    );
    
    const result = await Promise.race([transcribePromise, timeoutPromise]) as any;
    
    console.log("Whisper transcribed:", result.text);
    return NextResponse.json({ text: result.text.trim() });

  } catch (err: any) {
    console.error('Transcription error:', err);
    return NextResponse.json({ error: 'Failed to transcribe audio completely locally' }, { status: 500 });
  } finally {
    // Cleanup temporary files to prevent disk leaks
    if (tmpInputPath) fs.unlink(tmpInputPath).catch(() => {});
    if (tmpOutputPath) fs.unlink(tmpOutputPath).catch(() => {});
  }
}
