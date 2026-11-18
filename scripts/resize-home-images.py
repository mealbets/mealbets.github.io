"""Generate responsive homepage images. Requires Pillow with WebP support.
Run from any directory; original photos and full-size lightbox links are retained.
Use --source assets/img/chefs/name.webp to regenerate only a selected image.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageOps
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', action='append', help='Only process this recorded source path; may be repeated.')
args = parser.parse_args()

ROOT = Path(__file__).resolve().parent.parent
page = ROOT / 'index.html'
html = page.read_bytes().decode('utf-8')
output = ROOT / 'assets/media/responsive'
output.mkdir(parents=True, exist_ok=True)
count = 0

def responsive(match):
    global count
    tag = match.group()
    src_match = re.search(r'\bsrc="([^"]+)"', tag)
    if not src_match:
        return tag
    src = src_match[1]
    if not any(part in src for part in ('mealbets-app-ordering', '/gallery/', '/chefs/', '/qa/', '/responsive/')):
        return tag
    # Recover original source on subsequent runs.
    recorded = re.search(r'data-responsive-source="([^"]+)"', tag)
    if recorded:
        src = recorded[1]
    if args.source and src.lstrip('/') not in {source.lstrip('/') for source in args.source}:
        return tag
    path = ROOT / src.lstrip('/')
    with Image.open(path) as opened:
        image = ImageOps.exif_transpose(opened)
        w, h = image.size
        if '/qa/' in src:
            widths = [300, 600, 900]
            sizes = '(min-width: 360px) 300px, calc(100vw - 48px)'
            lossless = True
        elif '/gallery/' in src:
            slot = round(232 * w / h)
            widths = [slot, slot * 2, slot * 3]
            sizes = f'min({slot}px, calc(100vw - 52px))'
            lossless = False
        elif '/chefs/' in src:
            widths = [240, 360, 480]
            sizes = '(min-width: 1400px) 306px, (min-width: 1200px) 261px, (min-width: 992px) 216px, (min-width: 768px) 336px, (min-width: 576px) 516px, calc(100vw - 24px)'
            lossless = False
        else:
            widths = [320, 480]
            sizes = '(min-width: 1400px) 526px, (min-width: 1200px) 451px, (min-width: 992px) 376px, (min-width: 768px) 634px, (min-width: 576px) 516px, calc(100vw - 24px)'
            lossless = False
        candidates = []
        for width in sorted(set(min(w, width) for width in widths)):
            height = round(h * width / w)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            target = output / f'{path.stem}-{width}w.webp'
            options = {'method': 6, 'lossless': True} if lossless else {'method': 6, 'quality': 85}
            if image.info.get('icc_profile'):
                options['icc_profile'] = image.info['icc_profile']
            resized.save(target, 'WEBP', **options)
            candidates.append((f'/assets/media/responsive/{target.name}', width))
        if not lossless and w > candidates[-1][1]:
            candidates.append(('/' + src.lstrip('/'), w))
    # Use the small variant as a fallback; browsers select srcset by viewport/DPR.
    tag = re.sub(r'\bsrc="[^"]+"', f'src="{candidates[0][0]}"', tag)
    tag = re.sub(r'\s+(?:srcset|sizes|data-responsive-source)="[^"]*"', '', tag)
    srcset = ', '.join(f'{url} {width}w' for url, width in candidates)
    tag = tag.replace('<img ', f'<img data-responsive-source="{src}" srcset="{srcset}" sizes="{sizes}" ', 1)
    count += 1
    return tag

# Do not process archived images in HTML comments.
parts = re.split(r'(<!--[\s\S]*?-->)', html)
html = ''.join(part if part.startswith('<!--') else re.sub(r'<img\b[^>]*>', responsive, part) for part in parts)
page.write_bytes(html.encode('utf-8'))
print(f'Added responsive sizes for {count} homepage images.')
