import { BadRequestException, Controller, HttpCode, Post, UnsupportedMediaTypeException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_BYTES = 2 * 1024 * 1024;

/** The real type, from the file's first bytes. Never trust the file name or the browser's MIME type. */
function detectImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @Post('images')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES, files: 1 } })) // no storage option = kept in memory, checked before writing
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Send the image in the "file" field' });
    const ext = detectImage(file.buffer);
    if (!ext) throw new UnsupportedMediaTypeException({ code: 'UNSUPPORTED_IMAGE_TYPE', message: 'Only JPEG, PNG or WebP images' });

    const dir = path.join(path.resolve(this.config.get<string>('UPLOAD_DIR') ?? 'uploads'), 'products');
    const name = `${randomUUID()}.${ext}`; // the server picks the name: no path tricks possible
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), file.buffer);
    return { data: { url: `/uploads/products/${name}` } };
  }
}