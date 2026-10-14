#!/usr/bin/env python3
"""Convert vendored domain snapshots & curated sources into grouped offline Chrome DNR rules."""
import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / 'extension'
VENDOR = ROOT / 'vendor'
SOURCES = ROOT / 'tools' / 'sources'

CHUNK_SIZE = 1000

PROTECTED = {
    'github.com', 'github.io', 'paypal.com', 'paypal.me', 'raw.githubusercontent.com',
    'google.com', 'googleapis.com', 'gstatic.com', 'youtube.com', 'ytimg.com', 'googlevideo.com',
    'microsoft.com', 'live.com', 'office.com', 'apple.com', 'icloud.com', 'amazon.com',
    'cloudfront.net', 'akamaihd.net', 'cloudflare.com', 'jsdelivr.net', 'unpkg.com',
    'wikipedia.org', 'mozilla.org'
}

def normalize_domain(line):
    value = line.strip().lower().rstrip('.')
    if not value or value.startswith('#') or value.startswith('!'):
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

def read_lines(path):
    if not path.is_file():
        return []
    text = path.read_text(encoding='utf-8', errors='replace')
    res = []
    for line in text.splitlines():
        line = line.strip()
        if line and not line.startswith('#') and not line.startswith('!'):
            res.append(line)
    return res

def build_rules():
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true', help='Refresh snapshots over HTTPS before building.')
    args = parser.parse_args()

    bp_vendor = VENDOR / 'blocklistproject'
    bp_vendor.mkdir(parents=True, exist_ok=True)
    metadata = {'source': 'https://github.com/blocklistproject/Lists and curated sources', 'format': 'Bundled DNR rules; no runtime downloads.', 'categories': {}}

    # 1. Adult & Gambling
    for category, base in [('porn', 30000), ('gambling', 40000)]:
        path = bp_vendor / (category + '.txt')
        url = 'https://raw.githubusercontent.com/blocklistproject/Lists/main/alt-version/' + category + '-nl.txt'
        if args.download or not path.is_file():
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
            rules.append({
                'id': base + offset // CHUNK_SIZE,
                'priority': 100 if category == 'porn' else 90,
                'action': {'type': 'redirect', 'redirect': {'extensionPath': '/blocked-' + page + '.html'}},
                'condition': {'requestDomains': packaged[offset:offset + CHUNK_SIZE], 'resourceTypes': ['main_frame']}
            })
        target = EXT / ('rules-' + page + '.json')
        target.write_text(json.dumps(rules, separators=(',', ':')) + '\n')
        last_modified = next((line.removeprefix('# Last modified: ').strip() for line in text.splitlines()[:30] if line.startswith('# Last modified: ')), 'Not provided')
        metadata['categories'][page] = {
            'snapshot_url': url, 'upstream_modified': last_modified,
            'sha256': hashlib.sha256(data).hexdigest(), 'source_domains': len(source_domains),
            'validated_domains': len(domains), 'domain_conditions': len(collapsed), 'rules': len(rules),
            'excluded_invalid_or_protected': len(source_domains) - len(domains),
            'test_domain': test_domain, 'test_domains': 1
        }
        print(f'{page}: {len(domains):,} domains, {len(collapsed):,} conditions in {len(rules):,} rules')

    # 2. Extensive Ads (rules-ext-ads.json)
    ext_ads_domains = set()
    for line in read_lines(SOURCES / 'extensive-ads.txt'):
        if (d := normalize_domain(line)):
            ext_ads_domains.add(d)
    collapsed_ext_ads = collapse_children(ext_ads_domains)
    ext_ads_rules = []
    base_id = 50000
    for offset in range(0, len(collapsed_ext_ads), CHUNK_SIZE):
        ext_ads_rules.append({
            'id': base_id + (offset // CHUNK_SIZE),
            'priority': 1,
            'action': {'type': 'block'},
            'condition': {
                'requestDomains': collapsed_ext_ads[offset:offset + CHUNK_SIZE],
                'excludedResourceTypes': ['main_frame']
            }
        })
    (EXT / 'rules-ext-ads.json').write_text(json.dumps(ext_ads_rules, separators=(',', ':')) + '\n')
    print(f'ext_ads: {len(collapsed_ext_ads):,} conditions in {len(ext_ads_rules):,} rules')

    # 3. Extensive Trackers (rules-ext-trackers.json)
    ext_trackers_domains = set()
    url_filter_rules = []
    tracker_rule_id = 60000
    for line in read_lines(SOURCES / 'extensive-trackers.txt'):
        if line.startswith('||'):
            url_filter_rules.append({
                'id': tracker_rule_id,
                'priority': 1,
                'action': {'type': 'block'},
                'condition': {'urlFilter': line, 'excludedResourceTypes': ['main_frame']}
            })
            tracker_rule_id += 1
        elif (d := normalize_domain(line)):
            ext_trackers_domains.add(d)

    collapsed_ext_trackers = collapse_children(ext_trackers_domains)
    ext_trackers_rules = list(url_filter_rules)
    base_id = 61000
    for offset in range(0, len(collapsed_ext_trackers), CHUNK_SIZE):
        ext_trackers_rules.append({
            'id': base_id + (offset // CHUNK_SIZE),
            'priority': 1,
            'action': {'type': 'block'},
            'condition': {
                'requestDomains': collapsed_ext_trackers[offset:offset + CHUNK_SIZE],
                'excludedResourceTypes': ['main_frame']
            }
        })
    (EXT / 'rules-ext-trackers.json').write_text(json.dumps(ext_trackers_rules, separators=(',', ':')) + '\n')
    print(f'ext_trackers: {len(collapsed_ext_trackers):,} domain conditions + {len(url_filter_rules)} filter rules in {len(ext_trackers_rules):,} rules')

    # 4. Extensive Threats (rules-ext-threats.json)
    # Download/vendor malware, phishing, scam, fraud, ransomware, crypto lists
    threat_files = {
        'phishing': 'https://raw.githubusercontent.com/blocklistproject/Lists/main/alt-version/phishing-nl.txt',
        'scam': 'https://raw.githubusercontent.com/blocklistproject/Lists/main/alt-version/scam-nl.txt',
        'fraud': 'https://raw.githubusercontent.com/blocklistproject/Lists/main/alt-version/fraud-nl.txt',
        'ransomware': 'https://raw.githubusercontent.com/blocklistproject/Lists/main/alt-version/ransomware-nl.txt',
        'crypto': 'https://raw.githubusercontent.com/blocklistproject/Lists/main/alt-version/crypto-nl.txt'
    }
    threat_domains = set()
    for name, url in threat_files.items():
        tpath = bp_vendor / f'{name}.txt'
        if args.download or not tpath.is_file():
            print(f'Downloading {name} blocklist snapshot...')
            with urllib.request.urlopen(url, timeout=90) as response:
                tpath.write_bytes(response.read())
        for line in read_lines(tpath):
            if (d := normalize_domain(line)):
                threat_domains.add(d)

    test_sec_domain = 'security.tinyshield.test'
    collapsed_threats = sorted(set(collapse_children(threat_domains)) | {test_sec_domain})
    ext_threats_rules = []
    # Two rules per chunk: 1 redirect for main_frame, 1 block for sub-resources
    base_id = 70000
    for offset in range(0, len(collapsed_threats), CHUNK_SIZE):
        chunk = collapsed_threats[offset:offset + CHUNK_SIZE]
        chunk_idx = offset // CHUNK_SIZE
        # Main frame redirect
        ext_threats_rules.append({
            'id': base_id + chunk_idx * 2,
            'priority': 110,
            'action': {'type': 'redirect', 'redirect': {'extensionPath': '/blocked-security.html'}},
            'condition': {'requestDomains': chunk, 'resourceTypes': ['main_frame']}
        })
        # Sub-resources block
        ext_threats_rules.append({
            'id': base_id + chunk_idx * 2 + 1,
            'priority': 110,
            'action': {'type': 'block'},
            'condition': {'requestDomains': chunk, 'excludedResourceTypes': ['main_frame']}
        })
    (EXT / 'rules-ext-threats.json').write_text(json.dumps(ext_threats_rules, separators=(',', ':')) + '\n')
    print(f'ext_threats: {len(collapsed_threats):,} conditions in {len(ext_threats_rules):,} rules')

    # 5. Extensive Annoyances (rules-ext-annoyances.json)
    annoyance_domains = set()
    for line in read_lines(SOURCES / 'extensive-annoyances.txt'):
        if (d := normalize_domain(line)):
            annoyance_domains.add(d)
    collapsed_annoyances = collapse_children(annoyance_domains)
    ext_annoyances_rules = [
        # Global third-party ping / beacon blocking
        {
            'id': 80001,
            'priority': 1,
            'action': {'type': 'block'},
            'condition': {'domainType': 'thirdParty', 'resourceTypes': ['ping']}
        }
    ]
    base_id = 81000
    for offset in range(0, len(collapsed_annoyances), CHUNK_SIZE):
        ext_annoyances_rules.append({
            'id': base_id + (offset // CHUNK_SIZE),
            'priority': 1,
            'action': {'type': 'block'},
            'condition': {'requestDomains': collapsed_annoyances[offset:offset + CHUNK_SIZE]}
        })
    (EXT / 'rules-ext-annoyances.json').write_text(json.dumps(ext_annoyances_rules, separators=(',', ':')) + '\n')
    print(f'ext_annoyances: {len(collapsed_annoyances):,} conditions in {len(ext_annoyances_rules):,} rules')

    # 6. Extensive Privacy / Tracking Query Parameters (rules-ext-privacy.json)
    params = read_lines(SOURCES / 'tracking-params.txt')
    ext_privacy_rules = [
        {
            'id': 85001,
            'priority': 1,
            'action': {
                'type': 'redirect',
                'redirect': {
                    'transform': {
                        'queryTransform': {
                            'removeParams': params
                        }
                    }
                }
            },
            'condition': {
                'resourceTypes': ['main_frame', 'sub_frame'],
                'urlFilter': '|http*'
            }
        }
    ]
    (EXT / 'rules-ext-privacy.json').write_text(json.dumps(ext_privacy_rules, separators=(',', ':')) + '\n')
    print(f'ext_privacy: {len(params)} removed parameters in {len(ext_privacy_rules)} rule')

    # 7. Extensive Surrogates (rules-ext-surrogates.json)
    surrogates_map = json.loads((SOURCES / 'surrogates.json').read_text(encoding='utf-8'))
    ext_surrogates_rules = []
    base_id = 86000
    for idx, item in enumerate(surrogates_map):
        ext_surrogates_rules.append({
            'id': base_id + idx,
            'priority': 5,
            'action': {
                'type': 'redirect',
                'redirect': {
                    'extensionPath': '/' + item['resource'].lstrip('/')
                }
            },
            'condition': {
                'urlFilter': item['urlFilter'],
                'resourceTypes': ['script']
            }
        })
    (EXT / 'rules-ext-surrogates.json').write_text(json.dumps(ext_surrogates_rules, separators=(',', ':')) + '\n')
    print(f'ext_surrogates: {len(ext_surrogates_rules)} surrogate redirect rules')

    (EXT / 'blocklist-info.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print('All rules generated successfully.')

if __name__ == '__main__':
    build_rules()
