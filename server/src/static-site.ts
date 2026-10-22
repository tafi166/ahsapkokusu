import { resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * Serves the storefront build from the API process, doing what
 * deploy/nginx.conf.example does in front of it: hashed assets cached for good,
 * every other page path renders index.html (the single-page app routes it),
 * /sitemap.xml and /robots.txt come from the API, and pages get the storefront
 * security headers of deploy/parametrika-security-headers.conf.
 */
export function serveStorefront(app: NestExpressApplication, dir: string): void {
  const root = resolve(dir);
  const index = resolve(root, 'index.html');

  const pageHeaders = helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ['https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  const isApi = (path: string) => path === '/api' || path.startsWith('/api/');
  const isRead = (req: Request) => req.method === 'GET' || req.method === 'HEAD';

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path === '/sitemap.xml' || req.path === '/robots.txt') req.url = `/api${req.url}`;
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isRead(req) || isApi(req.path)) return next();
    pageHeaders(req, res, next);
  });

  app.useStaticAssets(root, {
    index: false,
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', path.startsWith(resolve(root, 'assets')) ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    // Missing build files are a 404, not the page shell.
    if (!isRead(req) || isApi(req.path) || req.path.startsWith('/assets/')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
}
