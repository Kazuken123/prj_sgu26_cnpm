"""Build-time preparation only, with pinned hashes and bounded safe extraction."""
import hashlib
import json
import pathlib
import shutil
import sys
import tarfile
import urllib.request

def download(spec, output):
    digest, size = hashlib.sha256(), 0
    with urllib.request.urlopen(spec['url'], timeout=60) as response, output.open('xb') as handle:
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            if size > spec['size']:
                raise ValueError('RESOURCE_TOO_LARGE')
            digest.update(chunk)
            handle.write(chunk)
    if size != spec['size'] or digest.hexdigest() != spec['sha256']:
        raise ValueError('RESOURCE_CHECKSUM_MISMATCH')

def extract(archive, target):
    total = 0
    with tarfile.open(archive, 'r:gz') as handle:
        for member in handle:
            dest = (target / member.name).resolve()
            total += member.size
            if (member.name.startswith('/') or not dest.is_relative_to(target.resolve()) or
                    not (member.isdir() or member.isfile()) or member.size > 300_000_000 or total > 600_000_000):
                raise ValueError('UNSAFE_RESOURCE_ARCHIVE')
            if member.isdir():
                dest.mkdir(parents=True, exist_ok=True)
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with handle.extractfile(member) as source, dest.open('xb') as output:
                    shutil.copyfileobj(source, output)

def install(manifest, target):
    target.mkdir(parents=True, exist_ok=False)
    archive = target / 'g2pw.tar.gz'
    download(manifest['g2pw'], archive)
    extract(archive, target / 'g2pW')
    if not (target / 'g2pW/g2pw.onnx').is_file():
        raise ValueError('MISSING_G2PW_MODEL')
    tokenizer = manifest['tokenizer']
    cache = target / 'hf-cache/hub/models--bert-base-chinese'
    snapshot = cache / 'snapshots' / tokenizer['revision']
    snapshot.mkdir(parents=True)
    for spec in tokenizer['files']:
        if pathlib.Path(spec['name']).name != spec['name']:
            raise ValueError('INVALID_TOKENIZER_PATH')
        url = 'https://huggingface.co/' + tokenizer['repository'] + '/resolve/' + tokenizer['revision'] + '/' + spec['name']
        download({**spec, 'url': url}, snapshot / spec['name'])
    (cache / 'refs').mkdir()
    (cache / 'refs/main').write_text(tokenizer['revision'])
    # Prevent optional-file probes; no network is allowed by the runtime helper.
    absent = cache / '.no_exist' / tokenizer['revision']
    absent.mkdir(parents=True)
    for name in ['added_tokens.json', 'special_tokens_map.json', 'chat_template.jinja']:
        (absent / name).touch()
    (target / 'manifest.json').write_text(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    install(json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8-sig')), pathlib.Path(sys.argv[2]))
