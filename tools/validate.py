#!/usr/bin/env python3
"""Check release assets, manifest paths and DNR domain conditions offline."""
import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / 'extension'

def main():
    manifest = json.loads((EXT / 'manifest.json').read_text(encoding='utf-8'))
    assert manifest['version'] == json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    assert len(manifest['description']) <= 132
    assert manifest['manifest_version'] == 3
    assert manifest['incognito'] == 'split', 'Blocked pages require split private-window support'
    assert 'tabs' not in manifest['permissions'] and 'history' not in manifest['permissions']
    paths = [manifest['background']['service_worker'], manifest['action']['default_popup'], manifest['options_ui']['page'], manifest['side_panel']['default_path'], *manifest['icons'].values()]
    for entry in manifest['web_accessible_resources']:
        paths.extend(entry['resources'])
    public = {path for entry in manifest['web_accessible_resources'] for path in entry['resources']}
    assert {'blocked-adult.html', 'blocked-gambling.html', 'blocked-security.html', 'blocked.js', 'ui.css', 'assets/shield.svg', 'assets/extensive.svg'} <= public
    assert any({'http://*/*', 'https://*/*'} <= set(entry['matches']) for entry in manifest['web_accessible_resources'])
    assert all(entry.get('use_dynamic_url') is False for entry in manifest['web_accessible_resources']), 'Static extensionPath redirects must have stable resource URLs'
    total = 0
    for ruleset in manifest['declarative_net_request']['rule_resources']:
        paths.append(ruleset['path'])
        rules = json.loads((EXT / ruleset['path']).read_text(encoding='utf-8'))
        if ruleset['id'] in ['adult_sites', 'gambling_sites']:
            category = ruleset['id'].removesuffix('_sites')
            assert any(category + '.tinyshield.test' in rule['condition'].get('requestDomains', []) for rule in rules)
        elif ruleset['id'] == 'ext_threats':
            assert any('security.tinyshield.test' in rule['condition'].get('requestDomains', []) for rule in rules)
        assert len({rule['id'] for rule in rules}) == len(rules)
        for rule in rules:
            assert rule['id'] > 0 and rule['priority'] > 0
            for domain in rule['condition'].get('requestDomains', []):
                assert domain.isascii() and '.' in domain and len(domain) <= 253
                assert all(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]*[a-z0-9])?', label) for label in domain.split('.'))
            if rule['action']['type'] == 'redirect':
                redirect_obj = rule['action'].get('redirect', {})
                if 'extensionPath' in redirect_obj:
                    target = redirect_obj['extensionPath'].lstrip('/')
                    paths.append(target)
                    assert target in public
                elif 'transform' in redirect_obj:
                    assert 'queryTransform' in redirect_obj['transform']
        total += len(rules)
    assert total < 30000
    for page in EXT.glob('*.html'):
        text = page.read_text(encoding='utf-8')
        assert '<script>' not in text and 'onclick=' not in text
        for attribute, value in re.findall(r'(src|href)="([^"]+)"', text):
            if not value.startswith(('https:', 'mailto:', '#')):
                paths.append(urlsplit(value).path)
    for path in paths:
        assert (EXT / path).is_file(), path
    has_node = bool(shutil.which('node'))
    for js in EXT.rglob('*.js'):
        if has_node:
            subprocess.run(['node', '--check', str(js)], check=True)
    for category in ['adult', 'gambling', 'security']:
        page = (EXT / f'blocked-{category}.html').read_text(encoding='utf-8')
        assert '<h1>This site is blocked</h1>' in page
        assert f'data-category="{category}"' in page
        assert 'id="github-link"' in page and 'https://github.com/GZVS' in page
    print(f'PASS: manifest, {total:,} DNR rules, domain syntax, local references and JavaScript syntax.')

if __name__ == '__main__':
    main()
