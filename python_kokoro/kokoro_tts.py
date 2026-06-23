import sys
import argparse
import soundfile as sf
import os
import warnings
warnings.filterwarnings("ignore")

from kokoro_onnx import Kokoro

def main():
    parser = argparse.ArgumentParser(description="Kokoro TTS CLI")
    parser.add_argument("--text", type=str, help="Text to speak")
    parser.add_argument("--output", type=str, required=True, help="Output WAV file")
    parser.add_argument("--voice", type=str, default="am_adam", help="Voice to use")
    
    args = parser.parse_args()
    
    text = args.text
    if not text:
        text = sys.stdin.read().strip()
        
    if not text:
        print("No text provided", file=sys.stderr)
        sys.exit(1)
        
    model_dir = os.path.dirname(__file__)
    
    try:
        # Load model using voices.bin!
        kokoro = Kokoro(os.path.join(model_dir, "kokoro-v0_19.onnx"), os.path.join(model_dir, "voices.bin"))
        
        # Generate audio
        samples, sample_rate = kokoro.create(text, voice=args.voice, speed=1.0, lang="en-us")
        
        # Save to file
        sf.write(args.output, samples, sample_rate)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
