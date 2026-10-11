#!/usr/bin/env python3
"""Convert vendored domain snapshots into grouped offline Chrome DNR rules."""
import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://raw.githubusercontent.com/blocklistproject/Lists/main/alt-version/'
CHUNK_SIZE = 1000
PROTECTED = {'github.com', 'github.io', 'paypal.com', 'paypal.me', 'raw.githubusercontent.com'}

def normalize_domain(line):
    value = line.strip().lower().rstrip('.')
    if not value or value.startswith('#'):
        return None
    try:
        value = value.encode('idna').decode('ascii')
    except UnicodeError:
        return None
    if len(value) > 253 or '.' not in value or re.fullmatch(r'[0-9.]+', value):
        return None
    if any(not label or len(label) > 63 or not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]*[a-z0-9])?', label) for label in value.split('.')):
        return None
    if any(root == value or root.endswith('.' + value) for root in PROTECTED):
        return None
    return value

def collapse_children(domains):
    """DNR requestDomains includes subdomains, so covered children are redundant."""
    return sorted(d for d in domains if not any('.'.join(d.split('.')[i:]) in domains for i in range(1, len(d.split('.')) - 1)))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true', help='Refresh snapshots over HTTPS before building.')
    args = parser.parse_args()
    vendor = ROOT / 'vendor' / 'blocklistproject'
    vendor.mkdir(parents=True, exist_ok=True)
    metadata = {'source': 'https://github.com/blocklistproject/Lists', 'format': 'Bundled main-frame redirect rules; no runtime downloads.', 'categories': {}}
    for category, base in [('porn', 30000), ('gambling', 40000)]:
        path = vendor / (category + '.txt')
        url = SOURCE + category + '-nl.txt'
        if args.download:
            with urllib.request.urlopen(url, timeout=90) as response:
                path.write_bytes(response.read())
        data = path.read_bytes()
        text = data.decode('utf-8')
        source_domains = {line.strip().lower().rstrip('.') for line in text.splitlines() if line and not line.startswith('#')}
        domains = {domain for line in text.splitlines() if (domain := normalize_domain(line))}
        collapsed = collapse_children(domains)
        rules = []
        page = 'adult' if category == 'porn' else category
        test_domain = page + '.tinyshield.test'
        packaged = sorted(set(collapsed) | {test_domain})
        for offset in range(0, len(packaged), CHUNK_SIZE):
            rules.append({'id': base + offset // CHUNK_SIZE, 'priority': 100 if category == 'porn' else 90,
                          'action': {'type': 'redirect', 'redirect': {'extensionPath': '/blocked-' + page + '.html'}},
                          'condition': {'requestDomains': packaged[offset:offset + CHUNK_SIZE], 'resourceTypes': ['main_frame']}})
        target = ROOT / 'extension' / ('rules-' + page + '.json')
        target.write_text(json.dumps(rules, separators=(',', ':')) + '\n')
        last_modified = next((line.removeprefix('# Last modified: ').strip() for line in text.splitlines()[:30] if line.startswith('# Last modified: ')), 'Not provided')
        metadata['categories'][page] = {'snapshot_url': url, 'upstream_modified': last_modified,
                                      'sha256': hashlib.sha256(data).hexdigest(), 'source_domains': len(source_domains),
                                      'validated_domains': len(domains), 'domain_conditions': len(collapsed), 'rules': len(rules),
                                      'excluded_invalid_or_protected': len(source_domains) - len(domains),
                                      'test_domain': test_domain, 'test_domains': 1}
        print(f'{page}: {len(domains):,} domains, {len(collapsed):,} conditions in {len(rules):,} rules')
    (ROOT / 'extension' / 'blocklist-info.json').write_text(json.dumps(metadata, indent=2) + '\n')

if __name__ == '__main__':
    main()
