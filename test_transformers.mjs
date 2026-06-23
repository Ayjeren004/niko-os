import { pipeline } from "@huggingface/transformers";
import fs from "fs";

async function main() {
  console.log("Loading VITS model...");
  const synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', { quantized: true });
  
  console.log("Generating audio...");
  const start = Date.now();
  const speaker_embeddings = 'https://huggingface.co/datasets/Xenova/cmu-arctic-xvectors-extracted/resolve/main/cmu_us_bdl_arctic-wav-spk_emb.tensor';
  const out = await synthesizer("Hello, my name is Niko.", { speaker_embeddings });
  console.log(`Generated in ${Date.now() - start}ms`);
  
  // out.audio is Float32Array, out.sampling_rate is integer
  const numChannels = 1;
  const sampleRate = out.sampling_rate;
  const pcmData = out.audio;
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
  
  fs.writeFileSync("test_vits.wav", wavBuffer);
  console.log("Saved test_vits.wav");
}

main().catch(console.error);
