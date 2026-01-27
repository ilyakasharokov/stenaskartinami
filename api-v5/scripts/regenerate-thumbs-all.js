const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BREAKPOINTS = {
  large: 1000,
  medium: 750,
  small: 500,
};

const THUMBNAIL = {
  width: 245,
  height: 156,
  fit: 'inside',
};

const PREFIXES = ['large_', 'medium_', 'small_', 'thumbnail_'];
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif', '.avif', '.svg']);

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

const generateSizes = async (uploadsDir, filename) => {
  const sourcePath = path.join(uploadsDir, filename);

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
        path: buildTargetPath(uploadsDir, `${key}_`, filename),
        options: { width: size, height: size, fit: 'inside' },
      });
    }
  });

  targets.push({
    key: 'thumbnail',
    path: buildTargetPath(uploadsDir, 'thumbnail_', filename),
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

const shouldProcess = (filename) => {
  if (PREFIXES.some((prefix) => filename.startsWith(prefix))) return false;
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
};

const run = async () => {
  const uploadsDir = getUploadsDir();
  const files = fs.readdirSync(uploadsDir);
  let processed = 0;
  let skipped = 0;

  for (const filename of files) {
    if (!shouldProcess(filename)) {
      skipped += 1;
      continue;
    }
    const result = await generateSizes(uploadsDir, filename);
    if (result.ok) {
      processed += 1;
    } else {
      skipped += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Processed: ${processed}, skipped: ${skipped}`);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message || error);
  process.exit(1);
});
