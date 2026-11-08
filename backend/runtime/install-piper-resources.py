"""Build-time preparation only, with pinned hashes and bounded safe extraction."""
import hashlib
import http.client
import json
import pathlib
import shutil
import ssl
import sys
import tarfile
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

def download(spec, output):
    def transfer(response, handle):
        digest, size = hashlib.sha256(), 0
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            if size > spec['size']:
                raise ValueError('RESOURCE_TOO_LARGE')
            digest.update(chunk)
            handle.write(chunk)
        if size != spec['size'] or digest.hexdigest() != spec['sha256']:
            raise ValueError('RESOURCE_CHECKSUM_MISMATCH')
    return download_with_retry(spec['url'], output, transfer)

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
