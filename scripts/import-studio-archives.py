"""Extend the Studio catalog from the supplied iOS archives without extracting executable content."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('drive_media', Path(__file__).with_name('import-studio-media.py'))
drive_media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(drive_media)

DAZZ_ID = '1TUwT1CyGw-wApW-S8UP7ezOYU7WklVhT'


def app_entries(archive):
    for entry in archive.infolist():
        parts = PurePosixPath(entry.filename).parts
        if len(parts) == 3 and parts[0] == 'Payload' and parts[1].endswith('.app') and not entry.is_dir():
            yield entry


def interpretation(name, data):
    if re.search(r'grain|noise', name):
        return 'grain'
    if re.search(r'leak|^light_', name):
        return 'leak'
    if 'dust' in name:
        return 'dust'
    if re.search(r'border|frame', name):
        return 'frame' if name.endswith('.png') and (data[25] in (4,6) or b'tRNS' in data[:2048]) else 'texture'
    if re.search(r'^vignette|^pattern|^overlay', name):
        return 'texture'
    return None


def import_effects(path):
    catalog = drive_media.DEST / 'catalog.json'
    document = json.loads(catalog.read_text())
    assets = document['assets']
    seen = {item['sha256'] for item in assets}
    next_id = max(int(item['group']) for item in assets) + 1
    counts = Counter()
    with ZipFile(path) as archive:
        for entry in sorted(app_entries(archive), key=lambda value: value.filename):
            name = PurePosixPath(entry.filename).name
            suffix = Path(name).suffix.lower()
            if suffix not in ('.jpg','.jpeg','.png') or entry.file_size > drive_media.MAX_BYTES:
                continue
            data = archive.read(entry)
            if len(data) < 26 or not drive_media.signature(data,suffix):
                continue
            category = interpretation(name.casefold(),data)
            digest = hashlib.sha256(data).hexdigest()
            if category is None or digest in seen:
                continue
            identifier = str(next_id).zfill(3)
            filename = identifier + suffix
            (drive_media.DEST / filename).write_bytes(data)
            assets.append({
                'id':identifier, 'group':identifier, 'file':filename, 'kind':'image',
                'category':category, 'sourceId':DAZZ_ID, 'sourceName':name,
                'sourceFolder':'DazzCam_Correto.ipa', 'sourcePath':entry.filename,
                'bytes':len(data), 'sha256':digest
            })
            counts[category] += 1
            seen.add(digest)
            next_id += 1
    catalog.write_text(json.dumps(document,ensure_ascii=False,separators=(',',':'))+'\n')
    return dict(counts)


def layout_slots(document):
    ratio = document['ratio']
    w, h = 1080, 1080 * ratio['height'] / ratio['width']
    for layer in document['layers']:
        if layer.get('isHidden'):
            continue
        content = layer['content']
        shape = content.get(content['type'],{})
        if content['type'] in ('frame','grid'):
            count = max(1,len(shape.get('slots',[])))
        elif content['type'] == 'image' and not shape.get('assetName') and layer.get('isPlaceholder'):
            count = 1
        else:
            continue
        transform = layer['transform']
        x = (transform['centerX']-transform['width']/2)/w*100
        y = (transform['centerY']-transform['height']/2)/h*100
        width, height = transform['width']/w*100, transform['height']/h*100
        columns = 1 if width < height else min(count,3)
        rows = (count + columns - 1)//columns
        for index in range(count):
            yield dict(x=round(x+index%columns*width/columns,2), y=round(y+index//columns*height/rows,2),
                       width=round(width/columns,2),height=round(height/rows,2))


def import_layouts(path):
    templates = []
    with ZipFile(path) as archive:
        for entry in sorted(app_entries(archive),key=lambda value: value.filename):
            name = PurePosixPath(entry.filename).name
            if not name.startswith('collage_template_') or not name.endswith('.json') or entry.file_size > 256_000:
                continue
            content = json.loads(archive.read(entry))
            document = content['document']
            ratio = document['ratio']
            background = document.get('background',{}).get('hex')
            if not isinstance(background,str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', background):
                background = '#252a29'
            slots = list(layout_slots(document))
            if not slots:
                continue
            templates.append({
                'id':str(len(templates)+1).zfill(2), 'ratio':f"{ratio['width']}:{ratio['height']}",
                'slides':document['slideCount'], 'background':background,
                'slots':slots, 'source':name
            })
    (drive_media.DEST/'layouts.json').write_text(json.dumps(templates,ensure_ascii=False,separators=(',',':'))+'\n')
    return len(templates)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dazz', required=True,type=Path)
    parser.add_argument('--twoshoot', required=True,type=Path)
    args = parser.parse_args()
    print(json.dumps({'efeitos':import_effects(args.dazz),'modelos':import_layouts(args.twoshoot)}))
