"""Exercise artifact validation and rollback without touching a real site."""

import io
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import receive


def archive(files=None, special=None):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w:gz') as bundle:
        for name, body in (files or {}).items():
            item = tarfile.TarInfo(name)
            item.size = len(body)
            bundle.addfile(item, io.BytesIO(body))
        if special:
            bundle.addfile(special)
    output.seek(0)
    return io.TextIOWrapper(output)


class ReceiverTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.base = Path(self.temporary.name)
        (self.base / 'releases/previous').mkdir(parents=True)
        self.previous = self.base / 'releases/previous'
        (self.previous / 'index.html').write_text('previous')
        (self.base / 'current').symlink_to(self.previous)
        self.base_patch = patch.object(receive, 'BASE', self.base)
        self.base_patch.start()
        self.files = {
            'index.html': b'<html>portfolio</html>',
            '_next/static/test.js': b'console.log("portfolio")',
            '_next/static/test.css': b'body { color: black; }',
            'blog/index.html': b'<html>blog</html>',
            'blog/feed.xml': b'<rss version="2.0"></rss>',
        }

    def tearDown(self):
        self.base_patch.stop()
        self.temporary.cleanup()

    def origin(self, path):
        name = path.lstrip('/')
        if not name or name.endswith('/'):
            name += 'index.html'
        return (self.base / 'current' / name).read_bytes()

    def deploy(self, stream):
        with patch('sys.stdin', stream):
            receive.deploy('a' * 40, '1', '1')

    def test_valid_release_is_activated_and_checked(self):
        with archive(self.files) as stream, patch.object(receive, 'origin_get', self.origin):
            self.deploy(stream)
        self.assertNotEqual((self.base / 'current').resolve(), self.previous)
        self.assertTrue((self.base / 'current/deployment.json').is_file())

    def test_origin_failure_restores_previous_release(self):
        with archive(self.files) as stream, patch.object(receive, 'origin_get', return_value=b'wrong'):
            with self.assertRaises(RuntimeError):
                self.deploy(stream)
        self.assertEqual((self.base / 'current').resolve(), self.previous)

    def test_blog_failure_restores_previous_release(self):
        def origin(path):
            return b'wrong' if path == '/blog/' else self.origin(path)

        with archive(self.files) as stream, patch.object(receive, 'origin_get', origin):
            with self.assertRaises(RuntimeError):
                self.deploy(stream)
        self.assertEqual((self.base / 'current').resolve(), self.previous)

    def test_traversal_is_rejected_before_activation(self):
        with archive({'../escaped': b'bad'}) as stream:
            with self.assertRaises(ValueError):
                self.deploy(stream)
        self.assertFalse((self.base / 'releases/escaped').exists())
        self.assertEqual((self.base / 'current').resolve(), self.previous)

    def test_links_are_rejected(self):
        link = tarfile.TarInfo('index.html')
        link.type = tarfile.SYMTYPE
        link.linkname = '/etc/passwd'
        with archive(special=link) as stream:
            with self.assertRaises(ValueError):
                self.deploy(stream)
        self.assertEqual((self.base / 'current').resolve(), self.previous)

    def test_shell_commands_are_rejected(self):
        with patch.dict('os.environ', {'SSH_ORIGINAL_COMMAND': 'whoami'}):
            with self.assertRaises(ValueError):
                receive.main()

    def test_server_release_restarts_and_checks_dynamic_routes(self):
        files = {'server.js': b'// server', 'public/placeholder': b'',
                 '.next/static/app.js': b'js', '.next/static/app.css': b'css'}
        paths = []

        def origin(path):
            paths.append(path)
            if path == '/deployment.json':
                return (self.base / 'current/public/deployment.json').read_bytes()
            if path.startswith('/_next/static/'):
                return (self.base / 'current/.next/static' / path.split('/')[-1]).read_bytes()
            return b'OK'

        with archive(files) as stream, patch.object(receive, 'origin_get', origin), patch.object(receive, 'restart_runtime') as restart:
            self.deploy(stream)
        restart.assert_called_once()
        for path in ['/blog/', '/blog/feed.xml', '/sitemap.xml']:
            self.assertIn(path, paths)

    def test_server_failure_restarts_previous_server(self):
        (self.previous / 'server.js').write_text('// previous server')
        files = {'server.js': b'// server', 'public/placeholder': b'',
                 '.next/static/app.js': b'js', '.next/static/app.css': b'css'}
        with archive(files) as stream, patch.object(receive, 'origin_get', side_effect=RuntimeError('unhealthy')), patch.object(receive, 'restart_runtime') as restart:
            with self.assertRaises(RuntimeError):
                self.deploy(stream)
        self.assertEqual(restart.call_count, 2)
        self.assertEqual((self.base / 'current').resolve(), self.previous)


if __name__ == '__main__':
    unittest.main()
