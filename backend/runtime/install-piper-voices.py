"""Build-time only: pinned public models, no account, secrets or runtime downloads."""
import hashlib
import http.client
import json
import pathlib
import ssl
import sys
import time
import urllib.error
import urllib.request


def download_with_retry(url, output, transfer):
    for attempt in range(1, 6):
        created = False
        try:
            with urllib.request.urlopen(url, timeout=60) as response, output.open('xb') as handle:
                created = True
                return transfer(response, handle)
        except Exception as error:
            if created:
                output.unlink()
            if isinstance(error, urllib.error.HTTPError):
                retryable = error.code in (408, 429) or 500 <= error.code < 600
            else:
                retryable = isinstance(error, (urllib.error.URLError, ssl.SSLError,
                                              TimeoutError, ConnectionError, http.client.IncompleteRead))
            if not retryable or attempt == 5:
                raise
            delay = 2 ** attempt
            print(f'DOWNLOAD_RETRY attempt={attempt + 1}/5 delay={delay}s', file=sys.stderr)
            time.sleep(delay)

manifest = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
target = pathlib.Path(sys.argv[2])
target.mkdir(parents=True, exist_ok=True)
for language, voice in manifest["voices"].items():
    base = ("https://huggingface.co/" + manifest["repository"] + "/resolve/"
            + manifest["revision"] + "/" + voice["directory"] + "/")
    for remote, local in [(voice["model"], voice["model"]), (voice["model"] + ".json", voice["model"] + ".json"), ("MODEL_CARD", language + "-MODEL_CARD.md")]:
        output = target / local
        def transfer(response, handle):
            digest = hashlib.sha256()
            size = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > (voice["size"] if remote.endswith(".onnx") else 65535):
                    raise ValueError("MODEL_DOWNLOAD_TOO_LARGE")
                digest.update(chunk)
                handle.write(chunk)
            if remote.endswith(".onnx") and (size != voice["size"] or digest.hexdigest() != voice["sha256"]):
                raise ValueError("MODEL_CHECKSUM_MISMATCH")
            return digest, size
        digest, size = download_with_retry(base + remote, output, transfer)
        print(language, local, digest.hexdigest(), size)
(target / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
