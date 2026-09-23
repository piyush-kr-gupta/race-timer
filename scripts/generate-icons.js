import fs from 'node:fs';
import zlib from 'node:zlib';

function createPng(size, colorPrimary = [249, 115, 22], colorBg = [15, 23, 42]) {
  // Simple PNG generator with anti-aliased circular stopwatch icon
  const width = size;
  const height = size;
  const rowLength = width * 4 + 1;
  const buffer = Buffer.alloc(height * rowLength);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.4;
  const innerRadius = width * 0.32;

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLength;
    buffer[rowStart] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded background card
      const cornerRadius = size * 0.22;
      const qx = Math.max(0, Math.abs(x - cx) - (size / 2 - cornerRadius));
      const qy = Math.max(0, Math.abs(y - cy) - (size / 2 - cornerRadius));
      const cornerDist = Math.sqrt(qx * qx + qy * qy);

      if (cornerDist > cornerRadius) {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0; // Transparent
        continue;
      }

      // Default background color
      let r = colorBg[0];
      let g = colorBg[1];
      let b = colorBg[2];
      let a = 255;

      // Outer ring
      if (dist <= radius && dist >= innerRadius) {
        const ringProgress = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
        if (ringProgress > 0.15) {
          r = colorPrimary[0];
          g = colorPrimary[1];
          b = colorPrimary[2];
        } else {
          r = 51; g = 65; b = 85;
        }
      }

      // Center timer needle/dot
      if (dist <= radius * 0.15) {
        r = 255; g = 255; b = 255;
      }

      // Top stopwatch pusher
      if (Math.abs(dx) <= width * 0.08 && y >= height * 0.06 && y <= height * 0.14) {
        r = 249; g = 115; b = 22;
      }

      // Hand pointing up-right
      const angle = Math.atan2(dy, dx);
      if (dist <= radius * 0.8 && Math.abs(angle - (-Math.PI / 4)) < 0.15) {
        r = 255; g = 255; b = 255;
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(buffer);

  function crc32(buf) {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

fs.writeFileSync('public/pwa-192x192.png', createPng(192));
fs.writeFileSync('public/pwa-512x512.png', createPng(512));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180));
console.log('Icons generated successfully.');
