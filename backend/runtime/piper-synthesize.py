"""Offline-only optional demo7 subprocess. Never receives application secrets."""
import argparse
import json
import os
import pathlib
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--resource-dir', required=True)
parser.add_argument('--model')
parser.add_argument('--speaker', type=int, default=0)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
resources = pathlib.Path(args.resource_dir)

def deny_network(event, unused_args):
    if event in ('socket.connect', 'socket.getaddrinfo', 'urllib.Request'):
        raise RuntimeError('PIPER_NETWORK_DISABLED')

sys.addaudithook(deny_network)
os.environ.update(HF_HOME=str(resources / 'hf-cache'), HF_HUB_OFFLINE='1',
                  TRANSFORMERS_OFFLINE='1', HF_HUB_DISABLE_TELEMETRY='1')
try:
    if not resources.is_absolute() or not resources.is_dir():
        raise ValueError('Missing resources')
    if args.check:
        from piper.phonemize_chinese import ChinesePhonemizer
        from piper.phonemize_japanese import JapanesePhonemizer
        assert (resources / 'g2pW/g2pw.onnx').is_file()
        assert ChinesePhonemizer(resources / 'g2pW').phonemize('中文')
        assert JapanesePhonemizer().phonemize('日本語')
        print('PIPER_RUNTIME_READY')
    else:
        if not args.model:
            raise ValueError('Missing model')
        with open(args.model + '.json', encoding='utf-8') as handle:
            config = json.load(handle)
        if not 0 <= args.speaker < config['num_speakers']:
            raise ValueError('Invalid speaker')
        text = sys.stdin.buffer.read(65537).decode('utf-8').strip()
        if not text or len(text.encode()) > 65535:
            raise ValueError('Invalid script')
        from piper import PiperVoice, SynthesisConfig
        voice = PiperVoice.load(args.model, download_dir=resources)
        for chunk in voice.synthesize(text, SynthesisConfig(speaker_id=args.speaker)):
            sys.stdout.buffer.write(chunk.audio_int16_bytes)
        sys.stdout.buffer.flush()
except Exception:
    # Process runner discards stderr; do not print paths, script or provider details.
    sys.stderr.write('PIPER_RUNTIME_FAILED\n')
    sys.exit(1)
