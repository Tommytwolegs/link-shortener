// qr.js
// ----------------------------------------------------------------------------
// Minimal QR code encoder for the popup's "QR for this link" button.
// Byte mode, error-correction level M, versions 1-20 (up to 666 bytes --
// far beyond any cleaned URL). Pure function of its input: no network,
// no DOM, no dependencies, same rules as ISO/IEC 18004.
//
// The RS block table and alignment-pattern positions below were extracted
// from the python-qrcode reference implementation, and the whole encoder
// is pinned by tests/qr.test.js to module matrices verified byte-for-byte
// against python-qrcode for every version in range and all eight masks.
//
// API (global.QrEncoder):
//   encode(text)      -> { size, modules }  modules[y][x] = true when dark
//   svg(text, margin) -> standalone <svg> string (black on white, with
//                        quiet zone), or null if text does not fit v20.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // [totalCodewords, dataCodewords] per RS block, ECC level M.
  const RS_M = { 1: [[26,16]], 2: [[44,28]], 3: [[70,44]], 4: [[50,32],[50,32]], 5: [[67,43],[67,43]], 6: [[43,27],[43,27],[43,27],[43,27]], 7: [[49,31],[49,31],[49,31],[49,31]], 8: [[60,38],[60,38],[61,39],[61,39]], 9: [[58,36],[58,36],[58,36],[59,37],[59,37]], 10: [[69,43],[69,43],[69,43],[69,43],[70,44]], 11: [[80,50],[81,51],[81,51],[81,51],[81,51]], 12: [[58,36],[58,36],[58,36],[58,36],[58,36],[58,36],[59,37],[59,37]], 13: [[59,37],[59,37],[59,37],[59,37],[59,37],[59,37],[59,37],[59,37],[60,38]], 14: [[64,40],[64,40],[64,40],[64,40],[65,41],[65,41],[65,41],[65,41],[65,41]], 15: [[65,41],[65,41],[65,41],[65,41],[65,41],[66,42],[66,42],[66,42],[66,42],[66,42]], 16: [[73,45],[73,45],[73,45],[73,45],[73,45],[73,45],[73,45],[74,46],[74,46],[74,46]], 17: [[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[74,46],[75,47]], 18: [[69,43],[69,43],[69,43],[69,43],[69,43],[69,43],[69,43],[69,43],[69,43],[70,44],[70,44],[70,44],[70,44]], 19: [[70,44],[70,44],[70,44],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45],[71,45]], 20: [[67,41],[67,41],[67,41],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42],[68,42]] };
  // Alignment pattern center coordinates.
  const ALIGN = { 1: [], 2: [6,18], 3: [6,22], 4: [6,26], 5: [6,30], 6: [6,34], 7: [6,22,38], 8: [6,24,42], 9: [6,26,46], 10: [6,28,50], 11: [6,30,54], 12: [6,32,58], 13: [6,34,62], 14: [6,26,46,66], 15: [6,26,48,70], 16: [6,26,50,74], 17: [6,30,54,78], 18: [6,30,56,82], 19: [6,30,58,86], 20: [6,34,62,90] };
  const MAX_VERSION = 20;

  // -- GF(256) multiply (polynomial 0x11D), Russian peasant ----------------
  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ (((z >>> 7) & 1) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }

  // Generator polynomial coefficients (monic, leading 1 omitted).
  function rsDivisor(degree) {
    const result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    const result = new Array(divisor.length).fill(0);
    for (const b of data) {
      const factor = b ^ result.shift();
      result.push(0);
      for (let i = 0; i < divisor.length; i++) {
        result[i] ^= gfMul(divisor[i], factor);
      }
    }
    return result;
  }

  // -- Text to interleaved codewords ----------------------------------------
  function utf8Bytes(text) {
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(text));
    const out = [];
    const enc = encodeURIComponent(text);
    for (let i = 0; i < enc.length; i++) {
      const ch = enc[i];
      if (ch === '%') { out.push(parseInt(enc.substr(i + 1, 2), 16)); i += 2; }
      else out.push(ch.charCodeAt(0));
    }
    return out;
  }

  function pickVersion(byteLen) {
    for (let v = 1; v <= MAX_VERSION; v++) {
      const dataBits = RS_M[v].reduce((n, b) => n + b[1], 0) * 8;
      const countBits = v <= 9 ? 8 : 16;
      if (4 + countBits + byteLen * 8 <= dataBits) return v;
    }
    return 0;
  }

  function buildCodewords(bytes, version) {
    const blocks = RS_M[version];
    const dataCap = blocks.reduce((n, b) => n + b[1], 0);
    const bits = [];
    const push = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };
    push(0x4, 4); // byte mode
    push(bytes.length, version <= 9 ? 8 : 16);
    for (const b of bytes) push(b, 8);
    // Terminator + pad to byte boundary.
    push(0, Math.min(4, dataCap * 8 - bits.length));
    if (bits.length % 8 !== 0) push(0, 8 - (bits.length % 8));
    // Pad codewords.
    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data.push(b);
    }
    for (let pad = 0xec; data.length < dataCap; pad ^= 0xfd) data.push(pad);

    // Split into blocks, compute ECC, interleave.
    const dataBlocks = [];
    const eccBlocks = [];
    let off = 0;
    for (const [total, dc] of blocks) {
      const chunk = data.slice(off, off + dc);
      off += dc;
      dataBlocks.push(chunk);
      eccBlocks.push(rsRemainder(chunk, rsDivisor(total - dc)));
    }
    const out = [];
    const maxD = Math.max(...dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxD; i++) {
      for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
    }
    const maxE = Math.max(...eccBlocks.map((b) => b.length));
    for (let i = 0; i < maxE; i++) {
      for (const b of eccBlocks) if (i < b.length) out.push(b[i]);
    }
    return out;
  }

  // -- Matrix ---------------------------------------------------------------
  function Matrix(version) {
    this.size = version * 4 + 17;
    this.version = version;
    this.modules = [];
    this.isFunction = [];
    for (let y = 0; y < this.size; y++) {
      this.modules.push(new Array(this.size).fill(false));
      this.isFunction.push(new Array(this.size).fill(false));
    }
  }

  Matrix.prototype.setFn = function (x, y, dark) {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  };

  Matrix.prototype.drawFunctionPatterns = function () {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      this.setFn(6, i, i % 2 === 0);
      this.setFn(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(n - 4, 3);
    this.drawFinder(3, n - 4);
    const pos = ALIGN[this.version];
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        // Skip the three corners occupied by finder patterns.
        if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1)
            || (i === pos.length - 1 && j === 0)) continue;
        this.drawAlignment(pos[i], pos[j]);
      }
    }
    this.drawFormatBits(0); // reserve the areas (real bits set after masking)
    this.drawVersionInfo();
  };

  Matrix.prototype.drawFinder = function (x, y) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || xx >= this.size || yy < 0 || yy >= this.size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFn(xx, yy, dist !== 2 && dist !== 4);
      }
    }
  };

  Matrix.prototype.drawAlignment = function (x, y) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFn(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  };

  Matrix.prototype.drawFormatBits = function (mask) {
    const data = (0 << 3) | mask; // ECC level M has format bits 00
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i) => ((bits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) this.setFn(8, i, bit(i));
    this.setFn(8, 7, bit(6));
    this.setFn(8, 8, bit(7));
    this.setFn(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.setFn(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.setFn(this.size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.setFn(8, this.size - 15 + i, bit(i));
    this.setFn(8, this.size - 8, true); // the fixed dark module
  };

  Matrix.prototype.drawVersionInfo = function () {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ (((rem >>> 11) & 1) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFn(a, b, dark);
      this.setFn(b, a, dark);
    }
  };

  Matrix.prototype.drawCodewords = function (codewords) {
    let i = 0;
    const total = codewords.length * 8;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < total) {
            this.modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  };

  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  Matrix.prototype.applyMask = function (mask) {
    const fn = MASKS[mask];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.isFunction[y][x] && fn(x, y)) this.modules[y][x] = !this.modules[y][x];
      }
    }
  };

  Matrix.prototype.penalty = function () {
    const n = this.size;
    const m = this.modules;
    let score = 0;
    // N1: runs of 5+ same-colored modules in rows/columns.
    for (let y = 0; y < n; y++) {
      let runX = 1;
      let runY = 1;
      for (let x = 1; x < n; x++) {
        if (m[y][x] === m[y][x - 1]) { runX++; if (runX === 5) score += 3; else if (runX > 5) score += 1; } else runX = 1;
        if (m[x][y] === m[x - 1][y]) { runY++; if (runY === 5) score += 3; else if (runY > 5) score += 1; } else runY = 1;
      }
    }
    // N2: 2x2 blocks of the same color.
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
      }
    }
    // N3: finder-like 1:1:3:1:1 pattern with 4 light modules on a side.
    const P1 = [true, false, true, true, true, false, true, false, false, false, false];
    const P2 = [false, false, false, false, true, false, true, true, true, false, true];
    const matches = (get, i) => {
      let a = true;
      let b = true;
      for (let k = 0; k < 11; k++) {
        const v = get(i + k);
        if (v !== P1[k]) a = false;
        if (v !== P2[k]) b = false;
        if (!a && !b) return false;
      }
      return true;
    };
    for (let y = 0; y < n; y++) {
      for (let i = 0; i <= n - 11; i++) {
        if (matches((k) => m[y][k], i)) score += 40;
        if (matches((k) => m[k][y], i)) score += 40;
      }
    }
    // N4: dark-module proportion.
    let dark = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) dark++;
    score += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
    return score;
  };

  // -- Public API -------------------------------------------------------------
  // forcedMask (0-7) is for tests; normal callers omit it and get the
  // lowest-penalty mask per the spec.
  function encode(text, forcedMask) {
    const bytes = utf8Bytes(String(text));
    const version = pickVersion(bytes.length);
    if (!version) return null;
    const codewords = buildCodewords(bytes, version);
    const mat = new Matrix(version);
    mat.drawFunctionPatterns();
    mat.drawCodewords(codewords);
    let best = forcedMask;
    if (typeof best !== 'number') {
      let bestScore = Infinity;
      for (let mask = 0; mask < 8; mask++) {
        mat.applyMask(mask);
        mat.drawFormatBits(mask);
        const score = mat.penalty();
        if (score < bestScore) { bestScore = score; best = mask; }
        mat.applyMask(mask); // XOR twice = undo
      }
    }
    mat.applyMask(best);
    mat.drawFormatBits(best);
    return { size: mat.size, version, mask: best, modules: mat.modules };
  }

  function svg(text, margin) {
    const q = encode(text);
    if (!q) return null;
    const b = typeof margin === 'number' ? margin : 4;
    const dim = q.size + b * 2;
    const parts = [];
    for (let y = 0; y < q.size; y++) {
      for (let x = 0; x < q.size; x++) {
        if (q.modules[y][x]) parts.push('M' + (x + b) + ' ' + (y + b) + 'h1v1h-1z');
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim
      + '" shape-rendering="crispEdges" role="img">'
      + '<rect width="' + dim + '" height="' + dim + '" fill="#ffffff"/>'
      + '<path d="' + parts.join('') + '" fill="#000000"/></svg>';
  }

  const api = { encode, svg };
  global.QrEncoder = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
