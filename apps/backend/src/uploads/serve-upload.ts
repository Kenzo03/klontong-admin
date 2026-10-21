import type { NestExpressApplication } from '@nestjs/platform-express';
import path from 'node:path';

export function serveUploads(app: NestExpressApplication) {
  app.useStaticAssets(path.resolve(process.env.UPLOAD_DIR ?? 'uploads'), {
    prefix: '/uploads',
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    immutable: true, // names are random UUIDs and never change
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });
}