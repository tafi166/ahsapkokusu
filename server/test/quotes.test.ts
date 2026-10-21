import type { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../src/prisma/prisma';
import { checkSvg } from '../src/quotes/svg';
import { createUser, login, ORIGIN, resetAuth, startApp, testPrisma } from './helpers';
import { quoteConfig } from './storefront-shared';

const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"';
const GOOD_SVG = `<svg ${SVG_NS} width="300mm" height="150mm" viewBox="0 0 300 150"><path d="M0 0L10 10"/></svg>`;
const INKSCAPE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg ${SVG_NS} xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
  xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cc="http://creativecommons.org/ns#"
  xmlns:dc="http://purl.org/dc/elements/1.1/" width="10cm" height="5cm" inkscape:version="1.3">
  <sodipodi:namedview id="nv" inkscape:zoom="1"/>
  <metadata><rdf:RDF><cc:Work><dc:title>Logo</dc:title></cc:Work></rdf:RDF></metadata>
  <defs><linearGradient id="g"><stop offset="0"/></linearGradient><path id="p" d="M0 0"/></defs>
  <g inkscape:label="Katman 1" style="fill:url(#g)"><use xlink:href="#p"/><text><tspan>Ada</tspan></text></g>
</svg>`;

describe('shared quote limits', () => {
  it('quote-config.json matches the storefront (run `npm run sync:storefront` if not)', () => {
    const file = path.join(__dirname, '..', 'src', 'quotes', 'quote-config.json');
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(quoteConfig());
  });
});

describe('checkSvg (allowlist)', () => {
  it('accepts a plain drawing and reads its physical size', () => {
    expect(checkSvg(Buffer.from(GOOD_SVG))).toEqual({ ok: true, physicalCm: { width: 30, height: 15 } });
  });

  it('accepts a typical Inkscape export with editor metadata', () => {
    expect(checkSvg(Buffer.from(INKSCAPE_SVG))).toEqual({ ok: true, physicalCm: { width: 10, height: 5 } });
  });

  it.each([
    ['script element', `<svg ${SVG_NS}><script>alert(1)</script></svg>`],
    ['event handler on root', `<svg ${SVG_NS} onload="alert(1)"/>`],
    ['event handler', `<svg ${SVG_NS}><rect onmouseover="x()"/></svg>`],
    ['foreignObject', `<svg ${SVG_NS}><foreignObject><div/></foreignObject></svg>`],
    ['XHTML element', `<svg ${SVG_NS} xmlns:h="http://www.w3.org/1999/xhtml"><h:script>alert(1)</h:script></svg>`],
    ['unknown SVG element', `<svg ${SVG_NS}><animate attributeName="href" to="javascript:alert(1)"/></svg>`],
    ['image element', `<svg ${SVG_NS}><image href="#x"/></svg>`],
    ['iframe', `<svg ${SVG_NS}><iframe/></svg>`],
    ['external href', `<svg ${SVG_NS} xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="other.svg#a"/></svg>`],
    ['javascript: value', `<svg ${SVG_NS}><a href="#x" fill="javascript:alert(1)"/></svg>`],
    ['data: value', `<svg ${SVG_NS}><rect fill="url(data:image/png;base64,AAAA)"/></svg>`],
    ['external CSS url', `<svg ${SVG_NS}><rect style="fill:url(https://evil.example/x)"/></svg>`],
    ['CSS @import', `<svg ${SVG_NS}><style>@import "https://evil.example/x.css";</style></svg>`],
    ['DOCTYPE / entities', `<!DOCTYPE svg [<!ENTITY x "y">]><svg ${SVG_NS}/>`],
    ['no SVG namespace', '<svg><path d="M0 0"/></svg>'],
    ['HTML document', '<html><body><svg/></body></html>'],
    ['broken markup', `<svg ${SVG_NS}><g></svg>`],
  ])('rejects %s', (_label, text) => {
    expect(checkSvg(Buffer.from(text)).ok).toBe(false);
  });

  it('rejects bytes that are not UTF-8 text', () => {
    expect(checkSvg(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x80])).ok).toBe(false);
  });
});

describe('quote API', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let uploadDir: string;

  beforeAll(async () => {
    prisma = testPrisma();
    uploadDir = await mkdtemp(path.join(tmpdir(), 'parametrika-quotes-'));
    app = await startApp({ UPLOAD_DIR: uploadDir, PUBLIC_FORM_RATE_LIMIT_PER_MIN: '1000' });
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await rm(uploadDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await resetAuth(prisma);
    await prisma.quoteRequest.deleteMany();
    await rm(path.join(uploadDir, 'quotes'), { recursive: true, force: true });
  });

  const fields = {
    widthCm: '30',
    heightCm: '15,5',
    material: 'MDF',
    quantity: '2',
    name: 'Ada Lovelace',
    email: 'Ada@Example.com',
    phone: '',
    notes: 'Kenarlar zımparalansın.',
  };

  function submit(target: INestApplication, svg: string | Buffer = GOOD_SVG, overrides: Record<string, string> = {}, filename = 'logo.svg') {
    let req = request(target.getHttpServer()).post('/api/quotes').set('Origin', ORIGIN);
    for (const [k, v] of Object.entries({ ...fields, ...overrides })) req = req.field(k, v);
    return req.attach('file', Buffer.isBuffer(svg) ? svg : Buffer.from(svg), { filename, contentType: 'image/svg+xml' });
  }

  async function storedFiles() {
    return readdir(path.join(uploadDir, 'quotes')).catch(() => [] as string[]);
  }

  it('stores a valid request and its file privately, returning a reference', async () => {
    const res = await submit(app).expect(201);
    expect(res.body).toEqual({ reference: expect.stringMatching(/^Q-[A-HJ-NP-Z2-9]{8}$/) });

    const quote = await prisma.quoteRequest.findUniqueOrThrow({ where: { reference: res.body.reference } });
    expect(quote).toMatchObject({ material: 'MDF', quantity: 2, contactEmail: 'ada@example.com', contactPhone: null, fileName: 'logo.svg', status: 'NEW' });
    expect(quote.widthCm.toNumber()).toBe(30);
    expect(quote.heightCm.toNumber()).toBe(15.5);

    expect(await storedFiles()).toEqual([`${quote.fileId}.svg`]);
    expect(await readFile(path.join(uploadDir, 'quotes', `${quote.fileId}.svg`), 'utf8')).toBe(GOOD_SVG);
    expect(await prisma.auditLog.count({ where: { action: 'quote.created', entityId: quote.id } })).toBe(1);
  });

  it('keeps only a display name from the client file name, never a path', async () => {
    for (const name of ['..\\..\\etc\\passwd.svg', '../../etc/passwd.svg']) {
      const res = await submit(app, GOOD_SVG, {}, name).expect(201);
      const quote = await prisma.quoteRequest.findUniqueOrThrow({ where: { reference: res.body.reference } });
      expect(quote.fileName).toBe('passwd.svg');
    }
    expect((await storedFiles()).every((f) => /^[0-9a-f-]{36}\.svg$/.test(f))).toBe(true);
    // Control characters in the name are refused by the multipart parser itself.
    await submit(app, GOOD_SVG, {}, 'pass\u0007wd.svg').expect(400);
  });

  it('requires an allowed Origin', async () => {
    await request(app.getHttpServer()).post('/api/quotes').attach('file', Buffer.from(GOOD_SVG), 'logo.svg').expect(403);
  });

  it.each([
    ['a size out of range', { widthCm: '1000' }],
    ['a material not offered', { material: 'Altın' }],
    ['a fractional quantity', { quantity: '1.5' }],
    ['an invalid email', { email: 'nope' }],
    ['an unknown field', { price: '1' }],
  ])('rejects %s and stores nothing', async (_label, overrides) => {
    await submit(app, GOOD_SVG, overrides).expect(400);
    expect(await prisma.quoteRequest.count()).toBe(0);
    expect(await storedFiles()).toEqual([]);
  });

  it('rejects an unsafe SVG, a non-SVG name and a missing file', async () => {
    const res = await submit(app, `<svg ${SVG_NS}><script>alert(1)</script></svg>`).expect(400);
    expect(res.body.message).toMatch(/İzin verilmeyen öğe/);
    const english = await submit(app, `<svg ${SVG_NS}><script>alert(1)</script></svg>`).set('Accept-Language', 'en-GB,en;q=0.9').expect(400);
    expect(english.body.message).toBe('The file contains a disallowed element: <script>.');
    expect((await submit(app, GOOD_SVG, {}, 'logo.png').set('Accept-Language', 'en').expect(400)).body.message).toBe('Only .svg files are accepted.');
    await submit(app, GOOD_SVG, {}, 'logo.png').expect(400);
    let req = request(app.getHttpServer()).post('/api/quotes').set('Origin', ORIGIN);
    for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
    await req.expect(400);
    expect(await prisma.quoteRequest.count()).toBe(0);
    expect(await storedFiles()).toEqual([]);
  });

  it('rejects files over the size limit with 413', async () => {
    const big = `<svg ${SVG_NS}><desc>${'x'.repeat(quoteConfig().maxFileBytes)}</desc></svg>`;
    await submit(app, big).expect(413);
    expect(await prisma.quoteRequest.count()).toBe(0);
  });

  it('caps quote requests across all visitors per 24 hours', async () => {
    const capped = await startApp({ UPLOAD_DIR: uploadDir, PUBLIC_FORM_RATE_LIMIT_PER_MIN: '1000', QUOTE_DAILY_LIMIT: '2' });
    try {
      await submit(capped).expect(201);
      await submit(capped).expect(201);
      await submit(capped).expect(429);
      // Older requests no longer count.
      await prisma.quoteRequest.updateMany({ data: { createdAt: new Date(Date.now() - 25 * 3_600_000) } });
      await submit(capped).expect(201);
    } finally {
      await capped.close();
    }
  });

  it('rate-limits submissions per IP', async () => {
    const limited = await startApp({ UPLOAD_DIR: uploadDir, PUBLIC_FORM_RATE_LIMIT_PER_MIN: '2' });
    try {
      await submit(limited).expect(201);
      await submit(limited).expect(201);
      await submit(limited).expect(429);
    } finally {
      await limited.close();
    }
  });

  describe('staff access', () => {
    async function staff(role: 'ADMIN' | 'EDITOR' = 'EDITOR') {
      await createUser(prisma, 'staff@example.com', role);
      return login(app, 'staff@example.com');
    }

    it('is closed to anonymous callers', async () => {
      await request(app.getHttpServer()).get('/api/admin/quotes').expect(401);
      const { body } = await submit(app).expect(201);
      const quote = await prisma.quoteRequest.findUniqueOrThrow({ where: { reference: body.reference } });
      await request(app.getHttpServer()).get(`/api/admin/quotes/${quote.id}/file`).expect(401);
    });

    it('lists requests newest first and shows one', async () => {
      await submit(app).expect(201);
      await submit(app, GOOD_SVG, { name: 'Bob' }).expect(201);
      const { agent } = await staff();
      const list = await agent.get('/api/admin/quotes').expect(200);
      expect(list.body.map((q: { contactName: string }) => q.contactName)).toEqual(['Bob', 'Ada Lovelace']);
      expect(list.body[0]).not.toHaveProperty('fileId');
      const one = await agent.get(`/api/admin/quotes/${list.body[1].id}`).expect(200);
      expect(one.body).toMatchObject({ reference: list.body[1].reference, widthCm: 30, heightCm: 15.5 });
    });

    it('downloads the file as a sandboxed attachment', async () => {
      const { body } = await submit(app).expect(201);
      const quote = await prisma.quoteRequest.findUniqueOrThrow({ where: { reference: body.reference } });
      const { agent } = await staff();
      const res = await agent.get(`/api/admin/quotes/${quote.id}/file`).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      }).expect(200);
      expect(res.headers['content-disposition']).toBe(`attachment; filename="${quote.reference}.svg"`);
      expect(res.headers['content-security-policy']).toContain('sandbox');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect((res.body as Buffer).toString('utf8')).toBe(GOOD_SVG);
    });

    it('updates the status with an audit entry', async () => {
      const { body } = await submit(app).expect(201);
      const quote = await prisma.quoteRequest.findUniqueOrThrow({ where: { reference: body.reference } });
      const { agent, csrf } = await staff();
      const patch = (b: object) => agent.patch(`/api/admin/quotes/${quote.id}`).set('Origin', ORIGIN).set('X-CSRF-Token', csrf).send(b);
      await patch({ status: 'REVIEWING' }).expect(200);
      await patch({ status: 'DONE' }).expect(400);
      await agent.patch(`/api/admin/quotes/${quote.id}`).set('Origin', ORIGIN).send({ status: 'QUOTED' }).expect(403);
      expect((await prisma.quoteRequest.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe('REVIEWING');
      const log = await prisma.auditLog.findFirstOrThrow({ where: { action: 'quote.status_changed' } });
      expect(log.details).toEqual({ from: 'NEW', to: 'REVIEWING' });
      await agent.get('/api/admin/quotes/00000000-0000-4000-8000-000000000000').expect(404);
    });
  });
});
