"""Import approved, browser-compatible media from the supplied Drive folder."""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import re
import urllib.request

ROOT = '1gaqlGsf48UUhre1qz8WJ3ESlxAQ7C1R7'
DEST = Path('dist/assets/studio')
INDEX = 'https://drive.google.com/embeddedfolderview?id='
DOWNLOAD = 'https://drive.usercontent.google.com/download?export=download&confirm=t&id='
FORMATS = {
    '.cube':'lut', '.png':'image', '.jpg':'image', '.jpeg':'image', '.webp':'image',
    '.mp4':'video', '.webm':'video', '.mp3':'audio', '.m4a':'audio', '.wav':'audio',
}
MAX_BYTES = 24 * 1024 * 1024


def entries(folder):
    with urllib.request.urlopen(INDEX + folder, timeout=25) as response:
        page = response.read().decode()
    return [(html.unescape(url), html.unescape(label)) for url, label in re.findall(
        r'<a[^>]+href="([^"]+)"[^>]*>.*?<div class="flip-entry-title">(.*?)</div>', page, re.S)]


def category(name, kind):
    for label in ('sticker', 'frame', 'grain', 'leak', 'dust', 'texture'):
        if label in name.casefold():
            return label
    return kind


def signature(data, extension):
    if extension == '.cube':
        return b'LUT_3D_SIZE' in data[:4096]
    if extension == '.png':
        return data.startswith(b'\x89PNG\r\n\x1a\n')
    if extension in ('.jpg', '.jpeg'):
        return data.startswith(b'\xff\xd8')
    if extension in ('.mp4', '.m4a'):
        return data[4:8] == b'ftyp'
    if extension == '.webm':
        return data.startswith(b'\x1a\x45\xdf\xa3')
    if extension in ('.webp', '.wav'):
        return data.startswith(b'RIFF') and data[8:12] == (b'WEBP' if extension == '.webp' else b'WAVE')
    return data.startswith(b'ID3') or data[:1] == b'\xff'


def download(entry):
    try:
        with urllib.request.urlopen(DOWNLOAD + entry['sourceId'], timeout=18) as response:
            data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            return (entry, 'excede 24 MiB')
        if not signature(data, Path(entry['file']).suffix):
            return (entry, 'conteúdo incompatível')
        path = DEST / entry['file']
        path.write_bytes(data)
        entry['bytes'] = len(data)
        entry['sha256'] = hashlib.sha256(data).hexdigest()
        return (entry, None)
    except Exception as error:
        return (entry, str(error))


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    folders = [(url.split('/')[-1], name) for url, name in entries(ROOT) if '/folders/' in url]
    source = {}
    ignored = []
    for folder, label in folders:
        for url, name in entries(folder):
            ext = Path(name).suffix.lower()
            match = re.search(r'/file/d/([^/]+)', url)
            if not match or ext not in FORMATS:
                ignored.append({'folder':label,'name':name})
                continue
            key = Path(name).stem.casefold()
            source.setdefault(key, []).append((name, ext, match[1], label))
    queue = []
    for index, variants in enumerate(source.values(),1):
        number = f'{index:03}'
        variants.sort(key=lambda row: {'image':0,'video':1,'lut':2,'audio':3}[FORMATS[row[1]]])
        for offset, (name, ext, identifier, folder) in enumerate(variants):
            kind = FORMATS[ext]
            identifier_number = number if offset == 0 else f'{number}.{offset}'
            queue.append({'id':identifier_number,'file':identifier_number+ext,'group':number,'kind':kind,
                          'category':category(name,kind),'sourceId':identifier,'sourceName':name,'sourceFolder':folder})
    previews = {Path(item['sourceName']).stem.casefold().removeprefix('paywall_fx_'): item
                for item in queue if item['kind'] == 'image' and item['sourceName'].casefold().startswith('paywall_fx_')}
    for item in queue:
        key = Path(item['sourceName']).stem.casefold()
        if item['kind'] == 'video' and key in previews and item['group'] != previews[key]['group']:
            group = previews[key]['group']
            suffix = 1
            names = {candidate['id'] for candidate in queue}
            while f'{group}.{suffix}' in names:
                suffix += 1
            item['id'] = f'{group}.{suffix}'
            item['group'] = group
            item['file'] = item['id'] + Path(item['file']).suffix
    queue.sort(key=lambda item: tuple(map(int,item['id'].split('.'))))
    assets = []
    skipped = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as workers:
        for entry, reason in workers.map(download, queue):
            if reason:
                skipped.append({'file':entry['sourceName'],'reason':reason})
            else:
                assets.append(entry)
            if (len(assets)+len(skipped)) % 100 == 0:
                print(f'{len(assets)} importados, {len(skipped)} pendentes ou incompatíveis', flush=True)
    (DEST/'catalog.json').write_text(json.dumps({'assets':assets},ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps({'published':len(assets), 'skipped':skipped,'otherEntries':len(ignored)},ensure_ascii=False))


if __name__ == '__main__':
    main()
