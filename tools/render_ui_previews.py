#!/usr/bin/env python3
"""Print-render production markup into UI previews, NOT live Chrome screenshots.

Optional developer dependencies: pip install weasyprint pymupdf
Use tests/browser-qa.mjs for actual installed-extension screenshots.
"""
import logging
import re
from pathlib import Path
import fitz
from weasyprint import HTML

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / 'extension'
OUT = ROOT / 'store-assets' / 'ui-previews'

def main_markup(page):
    return re.search(r'<main[\s\S]*?</main>', (EXT / page).read_text()).group()

def export(name, markup, extra=''):
    css = (EXT / 'ui.css').read_text()
    printing = '''@page { size:1280px 800px; margin:0; }
      html,body { width:1280px; height:800px; margin:0; }
      .main-controls { display:block; } .control-row { margin-bottom:13px; }
      .protection { height:45px; }
      .text-button { white-space:nowrap; }
    '''
    document = HTML(string='<html><head><style>' + css + printing + extra + '</style></head><body>' + markup + '</body></html>', base_url=str(EXT)).write_pdf()
    pdf = fitz.open(stream=document, filetype='pdf')
    pixmap = pdf[0].get_pixmap(matrix=fitz.Matrix(4 / 3, 4 / 3), alpha=False)
    assert (pixmap.width, pixmap.height) == (1280, 800)
    pixmap.save(OUT / name)
    print(name)

def enabled(markup, keys):
    return re.sub(r'<input([\s\S]*?)data-setting="(' + '|'.join(keys) + r')"', r'<input checked\1data-setting="\2"', markup)

def main():
    logging.getLogger('weasyprint').setLevel(logging.ERROR)
    OUT.mkdir(parents=True, exist_ok=True)
    popup = enabled(main_markup('popup.html'), ['adsEnabled', 'adultEnabled', 'gamblingEnabled'])
    popup = popup.replace('Loading protection…', 'Protection is on')
    # Print engines do not reproduce native HTML button rendering reliably.
    # These preview-only element substitutions keep the production CSS geometry.
    popup = re.sub(r'<button([\s\S]*?)id="protection"([\s\S]*?)>([\s\S]*?)</button>', r'<div\1id="protection"\2>\3</div>', popup)
    board = '''<div style="position:absolute;left:75px;top:215px;width:530px">
      <img src="assets/app-icon.svg" style="width:75px;height:75px">
      <h1 style="font-size:48px;margin-top:22px">A quieter, safer browser.</h1>
      <p style="font-size:22px;color:#57677c;line-height:1.6">Ads, adult sites and gambling.<br>Simple controls. Local filtering.</p></div>
      <div class="popup" style="position:absolute;right:105px;top:137px;border:1px solid #dce7f4;border-radius:14px;background:linear-gradient(140deg,#fff,#f0f7ff);box-shadow:0 15px 45px #17345515">'''
    export('01-controls-preview-1280x800.png', board + popup + '</div>')
    for category, number in [('adult', '02'), ('gambling', '03')]:
        page = main_markup('blocked-' + category + '.html')
        page = re.sub(r'<button([\s\S]*?)>([\s\S]*?)</button>', r'<a\1>\2</a>', page)
        extra = '''.blocked main { display:block; min-height:0; height:800px; padding-top:155px; }
          .blocked .large-shield { margin-bottom:26px; }
          .blocked .actions { display:block; margin:0 auto; }
          .blocked .actions .button { display:block; margin-bottom:12px; }
          .reason { display:inline-block; }'''
        export(number + '-' + category + '-blocked-preview-1280x800.png', '<div class="blocked">' + page + '</div>', extra)
    options = enabled(main_markup('options.html'), ['enabled', 'adsEnabled', 'trackersEnabled', 'adultEnabled', 'gamblingEnabled'])
    export('04-settings-preview-1280x800.png', '<div class="options">' + options + '</div>', '.options main { padding-top:26px; } .settings-row { padding:12px 0; } .settings-section { margin-top:22px; }')
    allowed = re.search(r'<section class="settings-section">\s*<h2>Allowed websites[\s\S]*?</section>', options).group()
    allowed = re.sub(r'<ul[\s\S]*?</ul>', '<ul class="site-list"><li><span>example.com</span><a class="remove">Remove</a></li></ul>', allowed, count=1)
    allowed = re.sub(r'<p id="allow-empty"[\s\S]*?</p>', '', allowed)
    export('05-allowed-sites-preview-1280x800.png', '<div class="options"><main><header class="brand"><img src="assets/shield.svg" alt=""><div><h1>TinyShield Settings</h1><p class="tagline">Simple controls. Your choices.</p></div></header>' + allowed + '<section class="settings-section note"><p>Allowed websites bypass all TinyShield filters, including adult and gambling blocking. The example.com entry illustrates an exception.</p></section></main></div>')

if __name__ == '__main__':
    main()
