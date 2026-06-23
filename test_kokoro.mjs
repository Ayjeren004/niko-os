import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";
import fs from "fs";

// Fix bug with path resolution in node
env.allowLocalModels = false;
env.useBrowserCache = false;

async function main() {
  console.log("Loading model...");
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-ONNX", { dtype: "q8" });
  
  console.log("Generating audio...");
  const start = Date.now();
  const audio = await tts.generate("Hello, I am Niko, your custom neural AI assistant running entirely on your local machine.", { voice: "am_adam" });
  console.log(`Generated in ${Date.now() - start}ms`);
  
  // Convert Float32Array to WAV format
  const numChannels = 1;
  const sampleRate = audio.sampling_rate;
  const pcmData = audio.audio;
  const wavBuffer = Buffer.alloc(44 + pcmData.length * 2);
  
  wavBuffer.write("RIFF", 0);
  wavBuffer.writeUInt32LE(36 + pcmData.length * 2, 4);
  wavBuffer.write("WAVE", 8);
  wavBuffer.write("fmt ", 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(numChannels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
  wavBuffer.writeUInt16LE(numChannels * 2, 32);
  wavBuffer.writeUInt16LE(16, 34);
  wavBuffer.write("data", 36);
  wavBuffer.writeUInt32LE(pcmData.length * 2, 40);
  
  let offset = 44;
  for (let i = 0; i < pcmData.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, pcmData[i]));
    wavBuffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7FFF, offset);
  }
  
  fs.writeFileSync("test.wav", wavBuffer);
  console.log("Saved test.wav");
}

main().catch(console.error);
