import hashlib
import importlib.util
import io
import json
import pathlib
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('resources', pathlib.Path(__file__).with_name('install-piper-resources.py'))
resources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(resources)

def archive(name='g2pw.onnx', link=False):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w:gz') as handle:
        item = tarfile.TarInfo(name)
        if link:
            item.type = tarfile.SYMTYPE
            item.linkname = '/outside'
        else:
            item.size = 3
        handle.addfile(item, None if link else io.BytesIO(b'abc'))
    return output.getvalue()

class ResourceTests(unittest.TestCase):
    def test_bad_checksum_and_size_are_rejected(self):
        for size, checksum in [(2, hashlib.sha256(b'abc').hexdigest()), (3, '0' * 64)]:
            with tempfile.TemporaryDirectory() as root, patch.object(resources.urllib.request, 'urlopen', return_value=io.BytesIO(b'abc')):
                with self.assertRaises(ValueError):
                    resources.download({'url': 'https://invalid.test', 'size': size, 'sha256': checksum}, pathlib.Path(root) / 'file')

    def test_traversal_and_symlink_are_rejected(self):
        for name, link in [('../outside', False), ('/outside', False), ('link', True)]:
            with tempfile.TemporaryDirectory() as root:
                filename = pathlib.Path(root) / 'input.tar.gz'
                filename.write_bytes(archive(name, link))
                with self.assertRaises(ValueError):
                    resources.extract(filename, pathlib.Path(root) / 'destination')

    def test_install_creates_pinned_offline_cache_and_preserves_existing_target(self):
        model = archive()
        def entry(url, data):
            return {'url': url, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        manifest = {'g2pw': entry('https://invalid.test/archive', model),
                    'tokenizer': {'repository': 'test/repo', 'revision': 'a' * 40, 'files': [{**entry('', b'vocab'), 'name': 'vocab.txt'}]}}
        with tempfile.TemporaryDirectory() as root:
            target = pathlib.Path(root) / 'runtime'
            with patch.object(resources.urllib.request, 'urlopen', side_effect=[io.BytesIO(model), io.BytesIO(b'vocab')]):
                resources.install(manifest, target)
            self.assertEqual((target / 'g2pW/g2pw.onnx').read_bytes(), b'abc')
            self.assertEqual((target / 'hf-cache/hub/models--bert-base-chinese/refs/main').read_text(), 'a' * 40)
            with self.assertRaises(FileExistsError):
                resources.install(manifest, target)
            self.assertEqual(json.loads((target / 'manifest.json').read_text()), manifest)

if __name__ == '__main__':
    unittest.main()
