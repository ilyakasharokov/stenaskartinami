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

const generateSizes = async (filename) => {
  const uploadsDir = getUploadsDir();
  const sourcePath = path.join(uploadsDir, filename);

  if (!fileExists(sourcePath)) {
    throw new Error(`Original file not found or empty: ${sourcePath}`);
  }

  const metadata = await sharp(sourcePath).metadata();
  const { width, height } = metadata || {};
  if (!width || !height) {
    throw new Error(`Unable to read image dimensions for ${filename}`);
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
};

const filename = process.argv[2];
if (!filename) {
  // eslint-disable-next-line no-console
  console.error('Usage: node scripts/regenerate-thumbs.js <filename>');
  process.exit(1);
}

generateSizes(filename)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`Generated formats for ${filename}`);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error.message || error);
    process.exit(1);
  });
