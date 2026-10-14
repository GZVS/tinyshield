#!/usr/bin/env python3
"""Build CRC-verified Chrome and Edge runtime packages with manifest at ZIP root."""
import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]

def package(target, output):
    manifest = json.loads((ROOT / 'extension' / 'manifest.json').read_text(encoding='utf-8'))
    version = manifest['version']
    manifest['version_name'] = f"{version} ({'Microsoft Edge' if target == 'edge' else 'Chrome'})"
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f'zenith-guard-v{version}-{target}.zip'
    with tempfile.NamedTemporaryFile(dir=output, suffix='.zip', delete=False) as temp:
        temporary = Path(temp.name)
    try:
        with ZipFile(temporary, 'w', ZIP_DEFLATED, compresslevel=9) as zipped:
            for file in sorted((ROOT / 'extension').rglob('*')):
                if file.is_file() and file.name != 'manifest.json':
                    zipped.write(file, file.relative_to(ROOT / 'extension'))
            zipped.writestr('manifest.json', json.dumps(manifest, indent=2) + chr(10))
            zipped.writestr('build-target.json', json.dumps({'browser': target, 'version': version}, indent=2) + chr(10))
        with ZipFile(temporary) as zipped:
            assert zipped.testzip() is None
            assert 'manifest.json' in zipped.namelist()
            assert json.loads(zipped.read('manifest.json'))['version'] == version
            assert json.loads(zipped.read('build-target.json'))['browser'] == target
        os.replace(temporary, archive)
    finally:
        temporary.unlink(missing_ok=True)
    print(archive)
    return archive

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', choices=['chrome', 'edge', 'all'], default='all')
    parser.add_argument('--output-directory', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    subprocess.run([sys.executable, str(ROOT / 'tools' / 'validate.py')], check=True)
    for target in ['chrome', 'edge'] if args.target == 'all' else [args.target]:
        package(target, args.output_directory)

if __name__ == '__main__':
    main()
