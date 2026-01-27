const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BREAKPOINTS = {
  medium: 750,
  small: 500,
};

const THUMBNAIL = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const getUploadsDir = () => path.join(process.cwd(), 'public', 'uploads');

const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
};

const buildTargetPath = (uploadsDir, prefix, originalName) =>
  path.join(uploadsDir, `${prefix}${originalName}`);

const generateResize = async (sourcePath, targetPath, options) => {
  await sharp(sourcePath).resize(options).toFile(targetPath);
};

const ensureOriginal = async (uploadsDir, originalName, largePath) => {
  const originalPath = path.join(uploadsDir, originalName);
  if (fileExists(originalPath)) {
    return originalPath;
  }
  if (!fileExists(largePath)) {
    return null;
  }
  fs.copyFileSync(largePath, originalPath);
  return originalPath;
};

const generateSizes = async (uploadsDir, originalName) => {
  const sourcePath = path.join(uploadsDir, originalName);

  if (!fileExists(sourcePath)) {
    return { ok: false, reason: 'missing' };
  }

  let metadata;
  try {
    metadata = await sharp(sourcePath).metadata();
  } catch {
    return { ok: false, reason: 'unsupported' };
  }

  const { width, height } = metadata || {};
  if (!width || !height) {
    return { ok: false, reason: 'no-dimensions' };
  }

  const targets = [];

  Object.entries(BREAKPOINTS).forEach(([key, size]) => {
    if (size < width || size < height) {
      targets.push({
        key,
        path: buildTargetPath(uploadsDir, `${key}_`, originalName),
        options: { width: size, height: size, fit: 'inside' },
      });
    }
  });

  targets.push({
    key: 'thumbnail',
    path: buildTargetPath(uploadsDir, 'thumbnail_', originalName),
    options: THUMBNAIL,
  });

  for (const target of targets) {
    if (fileExists(target.path)) {
      continue;
    }
    await generateResize(sourcePath, target.path, target.options);
  }

  return { ok: true };
};

const run = async () => {
  const uploadsDir = getUploadsDir();
  const files = fs.readdirSync(uploadsDir);
  const largeFiles = files.filter((name) => name.startsWith('large_'));

  let restored = 0;
  let processed = 0;
  let skipped = 0;

  for (const largeName of largeFiles) {
    const originalName = largeName.replace(/^large_/, '');
    const largePath = path.join(uploadsDir, largeName);
    const originalPath = await ensureOriginal(uploadsDir, originalName, largePath);

    if (!originalPath) {
      skipped += 1;
      continue;
    }

    if (originalPath && path.basename(originalPath) === originalName) {
      if (largePath && !fileExists(path.join(uploadsDir, originalName))) {
        restored += 1;
      }
    }

    const result = await generateSizes(uploadsDir, originalName);
    if (result.ok) {
      processed += 1;
    } else {
      skipped += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Restored originals: ${restored}, processed: ${processed}, skipped: ${skipped}`);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message || error);
  process.exit(1);
});
