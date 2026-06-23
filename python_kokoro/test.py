import soundfile as sf
from kokoro_onnx import Kokoro

def main():
    # It auto-downloads the model and voices!
    kokoro = Kokoro("kokoro-v0_19.onnx", "voices.json")
    samples, sample_rate = kokoro.create("Hello. This voice is much more emotional.", voice="am_adam", speed=1.0, lang="en-us")
    sf.write("audio.wav", samples, sample_rate)

if __name__ == "__main__":
    main()
