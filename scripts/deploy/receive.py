#!/usr/bin/python3
"""Restricted SSH receiver for this portfolio's static build artifacts."""

import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tarfile
import tempfile

BASE = Path('/var/www/deiondz.com')
DOMAIN = 'deiondz.com'
MAX_ARCHIVE = 100 * 1024 * 1024
MAX_EXTRACTED = 250 * 1024 * 1024


def activate(target):
    temporary = BASE / f'.current-{os.getpid()}'
    temporary.symlink_to(target)
    os.replace(temporary, BASE / 'current')


def origin_get(path):
    return subprocess.check_output([
        'curl', '--fail', '--silent', '--show-error', '--noproxy', '*',
        '--retry', '2', '--retry-all-errors', '--max-time', '15',
        '--resolve', f'{DOMAIN}:443:127.0.0.1', f'https://{DOMAIN}{path}',
    ])


def deploy(sha, run_id, attempt):
    release = BASE / 'releases' / f'{sha}-{run_id}-{attempt}'
    if release.exists():
        raise RuntimeError('Release already exists. Re-run the GitHub job with a new attempt.')
    previous = (BASE / 'current').resolve(strict=True)
    release.mkdir(mode=0o755)
    switched = False
    try:
        with tempfile.TemporaryFile() as archive:
            received = 0
            while chunk := sys.stdin.buffer.read(1024 * 1024):
                received += len(chunk)
                if received > MAX_ARCHIVE:
                    raise ValueError('Archive exceeds the upload size limit.')
                archive.write(chunk)
            archive.seek(0)
            with tarfile.open(fileobj=archive, mode='r:gz') as bundle:
                members = bundle.getmembers()
                if len(members) > 20000 or sum(m.size for m in members) > MAX_EXTRACTED:
                    raise ValueError('Archive exceeds the extracted size limit.')
                for member in members:
                    if not (member.isfile() or member.isdir()):
                        raise ValueError(f'Links and special files are forbidden: {member.name}')
                    if Path(member.name).is_absolute() or '..' in Path(member.name).parts:
                        raise ValueError(f'Unsafe archive path: {member.name}')
                bundle.extractall(release, members=members, filter='data')
        index = release / 'index.html'
        if not index.is_file() or index.stat().st_size == 0:
            raise ValueError('Build is missing index.html.')
        # Nginx needs read access regardless of artifact permissions.
        for path in release.rglob('*'):
            path.chmod(0o755 if path.is_dir() else 0o644)
        assets = [
            next((release / '_next/static').rglob('*.js')),
            next((release / '_next/static').rglob('*.css')),
        ]
        marker = {'sha': sha, 'run_id': run_id, 'attempt': attempt}
        (release / 'deployment.json').write_text(json.dumps(marker) + '\n')
        activate(release)
        switched = True
        if hashlib.sha256(origin_get('/')).digest() != hashlib.sha256(index.read_bytes()).digest():
            raise RuntimeError('Origin homepage differs from the uploaded build.')
        if json.loads(origin_get('/deployment.json')) != marker:
            raise RuntimeError('Origin release marker did not match.')
        for relative, url in [('blog/index.html', '/blog/'), ('blog/feed.xml', '/blog/feed.xml')]:
            generated = release / relative
            if generated.is_file() and hashlib.sha256(origin_get(url)).digest() != hashlib.sha256(generated.read_bytes()).digest():
                raise RuntimeError(f'Origin blog page did not match: {relative}')
        for asset in assets:
            body = origin_get('/' + asset.relative_to(release).as_posix())
            if hashlib.sha256(body).digest() != hashlib.sha256(asset.read_bytes()).digest():
                raise RuntimeError(f'Origin asset did not match: {asset.name}')
        print(f'Deployed {sha}; origin pages, RSS, JavaScript, and CSS verified.', flush=True)
    except BaseException:
        if switched:
            activate(previous)
            print(f'Health check failed; restored {previous.name}.', file=sys.stderr, flush=True)
        raise


def main():
    command = shlex.split(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    if (len(command) != 4 or command[0] != 'deploy'
            or not re.fullmatch(r'[0-9a-f]{40}', command[1])
            or not all(re.fullmatch(r'[1-9][0-9]*', value) for value in command[2:])):
        raise ValueError('Allowed command: deploy <40-character sha> <run id> <attempt>')
    os.umask(0o022)
    with (BASE / '.deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        deploy(*command[1:])


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Deployment failed: {error}', file=sys.stderr)
        sys.exit(1)
