const SUPPORTED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  '.gif',
  '.avif',
]);
import fs from 'fs';
import path from 'path';

const getPublicDir = (strapi: any) => {
  const direct = strapi?.dirs?.static?.public;
  if (direct) return direct;
  return path.join(strapi.dirs.app.root, 'public');
};

const hasMissingFormats = (formats: any, publicDir: string) => {
  if (!formats || typeof formats !== 'object') return true;
  const keys = Object.keys(formats);
  if (!keys.length) return true;
  const required = ['thumbnail', 'small', 'medium', 'large'];
  return required.some((key) => {
    const entry = formats[key];
    if (!entry || !entry.url) return true;
    const filePath = toFilePath(publicDir, entry.url);
    return !filePath || !fs.existsSync(filePath);
  });
};

const toFilePath = (publicDir: string, url?: string | null) => {
  if (!url) return null;
  return path.join(publicDir, url.replace(/^\//, ''));
};

const getFallbackCandidates = (publicDir: string, formats: any) => {
  if (!formats || typeof formats !== 'object') return [];
  const order = ['large', 'medium', 'small', 'thumbnail'];
  return order
    .map((key) => {
      const entry = formats?.[key];
      return {
        key,
        width: entry?.width ?? null,
        height: entry?.height ?? null,
        url: entry?.url ?? null,
        path: toFilePath(publicDir, entry?.url),
      };
    })
    .filter((value) => Boolean(value.path));
};

export default async function regenerateUploadFormats(strapi: any) {
  const uploadService = strapi.plugin('upload').service('upload');
  const publicDir = getPublicDir(strapi);
  const targetUrl = process.env.REGENERATE_UPLOAD_FORMATS_TARGET;
  const restoreOriginalOnly = process.env.REGENERATE_UPLOAD_FORMATS_RESTORE_ORIGINAL === 'true';
  const allowOriginalOverwrite =
    process.env.REGENERATE_UPLOAD_FORMATS_ALLOW_ORIGINAL_OVERWRITE === 'true';
  const pageSize = 100;
  let start = 0;
  const seenIds = new Set<number>();

  strapi.log.info('Regenerating upload formats (thumbnails/responsive).');

  while (true) {
    const files = await strapi.entityService.findMany('plugin::upload.file', {
      pagination: { start, limit: pageSize },
      sort: ['id:asc'],
      ...(targetUrl ? { filters: { url: { $eq: targetUrl } } } : {}),
    });

    if (!Array.isArray(files) || files.length === 0) break;

    for (const file of files) {
      if (file?.id && seenIds.has(file.id)) {
        strapi.log.warn('Detected repeating page of uploads; stopping.');
        return;
      }
      if (file?.id) seenIds.add(file.id);
      if (!file || !file.mime || !file.mime.startsWith('image/')) continue;
      if (!hasMissingFormats(file.formats, publicDir)) continue;

      const ext =
        (file.ext || path.extname(file.name || '') || '').toLowerCase();
      if (ext && !SUPPORTED_EXTENSIONS.has(ext)) {
        strapi.log.warn(`Skipped unsupported extension: ${file?.url}`);
        continue;
      }

      const originalPath = toFilePath(publicDir, file.url);
      const fallbackCandidates = getFallbackCandidates(publicDir, file.formats).sort((a, b) => {
        const aArea = (a.width ?? 0) * (a.height ?? 0);
        const bArea = (b.width ?? 0) * (b.height ?? 0);
        return bArea - aArea;
      });
      if (restoreOriginalOnly && targetUrl && originalPath) {
        const best = fallbackCandidates.find((candidate) =>
          ['large', 'medium'].includes(candidate.key)
        );
        const originalExists =
          fs.existsSync(originalPath) && fs.statSync(originalPath).size > 0;
        if (originalExists || !allowOriginalOverwrite) {
          strapi.log.warn(`Original not overwritten: ${file?.url}`);
        } else if (best?.path && fs.existsSync(best.path) && fs.statSync(best.path).size > 0) {
          fs.copyFileSync(best.path, originalPath);
          strapi.log.info(
            `Restored original from ${path.basename(best.path)} -> ${path.basename(originalPath)}`
          );
        } else {
          strapi.log.warn(`No large/medium format found for ${file?.url}`);
        }
        continue;
      }
      const candidatePaths = [
        originalPath,
        ...fallbackCandidates.map((candidate) => candidate.path),
      ].filter((value, index, self) => value && self.indexOf(value) === index);

      let processed = false;
      for (const candidatePath of candidatePaths) {
        if (!candidatePath || !fs.existsSync(candidatePath)) {
          continue;
        }
        const stats = fs.statSync(candidatePath);
        if (!stats.size) {
          continue;
        }
        const fileData = {
          ...file,
          filepath: candidatePath,
          sizeInBytes: stats.size,
          size: file.size ?? stats.size / 1000,
          getStream: () => fs.createReadStream(candidatePath),
        };

        try {
          await uploadService._uploadImage(fileData);
          await strapi.entityService.update('plugin::upload.file', file.id, {
            data: {
              formats: fileData.formats,
              width: fileData.width,
              height: fileData.height,
            },
          });
          // Never overwrite originals during regeneration
          processed = true;
          break;
        } catch (error: any) {
          const message = error?.message || 'unknown error';
          strapi.log.warn(
            `Failed processing ${file?.url} using ${path.basename(candidatePath)} (${message})`
          );
        }
      }

      if (!processed) {
        strapi.log.warn(`Skipped unsupported image: ${file?.url}`);
      }
    }

    if (targetUrl || files.length < pageSize) break;
    start += pageSize;
  }

  strapi.log.info('Upload formats regeneration done.');
}
