// 依存パッケージなしの最小ZIP(store=無圧縮)ライター。Cloudflare Pages Functionsは
// ビルドステップを持たずnpmパッケージを同梱できないため、CRC32+ローカルヘッダ+
// セントラルディレクトリだけの最小実装を自前で持つ（無圧縮なので画像・動画中心の
// 転送用途では十分高速）。

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function utf8Bytes(str) {
  return new TextEncoder().encode(str);
}

function u16(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}
function u32(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]);
}

function concat(chunks) {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

// files: [{name: string, data: Uint8Array}]
export function zipStore(files) {
  const { dosTime, dosDate } = dosDateTime(new Date());
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = utf8Bytes(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    // General purpose flag bit 11 (0x0800) = UTF-8 filename
    const gpFlag = 0x0800;

    const localHeader = concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(gpFlag),
      u16(0), // compression = store
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(size), // compressed size
      u32(size), // uncompressed size
      u16(nameBytes.length),
      u16(0), // extra field length
    ]);
    localParts.push(localHeader, nameBytes, f.data);

    const centralHeader = concat([
      u32(0x02014b50),
      u16(20), // version made by
      u16(20), // version needed
      u16(gpFlag),
      u16(0), // compression
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0), // extra field length
      u16(0), // comment length
      u16(0), // disk number start
      u16(0), // internal attrs
      u32(0), // external attrs
      u32(offset), // relative offset of local header
    ]);
    centralParts.push(centralHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + f.data.length;
  }

  const centralDir = concat(centralParts);
  const localData = concat(localParts);

  const eocd = concat([
    u32(0x06054b50),
    u16(0), // disk number
    u16(0), // disk with central dir
    u16(files.length), // entries on this disk
    u16(files.length), // total entries
    u32(centralDir.length),
    u32(localData.length), // offset of central dir
    u16(0), // comment length
  ]);

  return concat([localData, centralDir, eocd]);
}
