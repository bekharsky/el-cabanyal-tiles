import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';

const INPUT_DIR = './tiles';
const OUTPUT_DIR = './tiles_small';
const MARKER_DIR = './tiles_markers';
const OUTPUT_JSON = './tiles.json';
const PIN_MASK = Buffer.from(`
<svg version="1.0" xmlns="http://www.w3.org/2000/svg"
 width="80" height="128" viewBox="0 0 732 1280"
 preserveAspectRatio="xMidYMid meet">
<g transform="translate(0,1280) scale(0.1,-0.1)" fill="#000000" stroke="none">
<path d="M3480 12794 c-25 -2 -101 -9 -170 -14 -1218 -106 -2341 -869 -2904
-1974 -238 -466 -363 -929 -396 -1469 -72 -1160 578 -3181 1950 -6062 204
-426 693 -1400 938 -1865 314 -597 751 -1399 762 -1400 5 0 260 456 416 745
1552 2875 2655 5432 3054 7079 131 543 184 921 184 1316 0 569 -114 1067 -359
1577 -552 1148 -1661 1923 -2935 2053 -112 11 -465 21 -540 14z"/>
</g>
</svg>
`);

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}
if (!fs.existsSync(MARKER_DIR)) {
    fs.mkdirSync(MARKER_DIR);
}

const files = fs.readdirSync(INPUT_DIR).filter(file => file.match(/\.jpe?g$/i));
const results = [];

for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);
    const markerPath = path.join(MARKER_DIR, file);

    const buffer = fs.readFileSync(inputPath);
    const parser = exifParser.create(buffer);
    const exif = parser.parse();

    if (!exif.tags || !exif.tags.GPSLatitude || !exif.tags.GPSLongitude) {
        console.warn(`No GPS data for ${file}`);
        continue;
    }

    await sharp(inputPath)
        .resize(800)
        .rotate(90)
        .toFile(outputPath);

    await sharp(outputPath)
        .resize(80, 128)
        .composite([{ input: PIN_MASK, blend: 'dest-in' }])
        .png()
        .toFile(markerPath);

    results.push({
        name: file,
        thumbnail: outputPath,
        marker: markerPath,
        lat: exif.tags.GPSLatitude,
        lng: exif.tags.GPSLongitude
    });
}

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2));
console.log('Processing complete!');
