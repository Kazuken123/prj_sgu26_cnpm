"""Build-time only: pinned public models, no account, secrets or runtime downloads."""
import hashlib
import json
import pathlib
import sys
import urllib.request

manifest = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
target = pathlib.Path(sys.argv[2])
target.mkdir(parents=True, exist_ok=True)
for language, voice in manifest["voices"].items():
    base = ("https://huggingface.co/" + manifest["repository"] + "/resolve/"
            + manifest["revision"] + "/" + voice["directory"] + "/")
    for remote, local in [(voice["model"], voice["model"]), (voice["model"] + ".json", voice["model"] + ".json"), ("MODEL_CARD", language + "-MODEL_CARD.md")]:
        output = target / local
        digest = hashlib.sha256()
        size = 0
        with urllib.request.urlopen(base + remote, timeout=60) as response, output.open("xb") as handle:
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
        print(language, local, digest.hexdigest(), size)
(target / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
