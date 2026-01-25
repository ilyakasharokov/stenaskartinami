'use strict';

import fs from 'fs';
import path from 'path';
import { BSON, ObjectId } from 'bson';

const DUMP_DIR = path.resolve(process.cwd(), '..', 'dump', 'strapi');
const UPLOADS_SRC_DIR = path.resolve(process.cwd(), '..', 'api', 'public', 'uploads');
const UPLOADS_DST_DIR = path.resolve(process.cwd(), 'public', 'uploads');

const isObjectId = (value: unknown): value is ObjectId => value instanceof ObjectId;

const normalizeId = (value: any) => {
  if (!value) return null;
  if (value._id) return normalizeId(value._id);
  if (typeof value === 'string') return value;
  if (isObjectId(value)) return value.toString();
  if (value.$oid) return value.$oid;
  return value.toString();
};

const ensureArray = (value: any) => (Array.isArray(value) ? value : []);

const mapIds = (values: any, idMap: Map<string, number>) =>
  ensureArray(values)
    .map(normalizeId)
    .map((id: string) => idMap.get(id))
    .filter(Boolean);

const normalizeEmail = (value: any) => {
  if (!value) return null;
  const trimmed = value.toString().trim();
  return trimmed.length ? trimmed : null;
};

const readBsonFile = (filePath: string) => {
  const buffer = fs.readFileSync(filePath);
  const docs: any[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const size = buffer.readInt32LE(offset);
    const chunk = buffer.slice(offset, offset + size);
    docs.push(BSON.deserialize(chunk));
    offset += size;
  }

  return docs;
};

const copyUploadIfExists = (fileDoc: any) => {
  const url = fileDoc.url || '';
  const filenameFromUrl = url ? path.basename(url) : null;
  const filenameFromHash = fileDoc.hash && fileDoc.ext ? `${fileDoc.hash}${fileDoc.ext}` : null;
  const candidateNames = [filenameFromUrl, filenameFromHash].filter(Boolean);

  for (const name of candidateNames) {
    const dstPath = path.join(UPLOADS_DST_DIR, name);
    if (fs.existsSync(dstPath)) {
      return { found: true };
    }

    const srcPath = path.join(UPLOADS_SRC_DIR, name);
    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(UPLOADS_DST_DIR, { recursive: true });
      fs.copyFileSync(srcPath, dstPath);
      return { found: true };
    }
  }

  const formats = fileDoc.formats || {};
  const formatCandidates = ['large', 'medium', 'small', 'thumbnail']
    .map((key) => formats[key])
    .filter(Boolean);

  for (const format of formatCandidates) {
    const formatUrl = format.url || '';
    const formatName = formatUrl ? path.basename(formatUrl) : null;
    const formatHashName =
      format.hash && format.ext ? `${format.hash}${format.ext}` : null;
    const formatNames = [formatName, formatHashName].filter(Boolean);

    for (const name of formatNames) {
      const dstPath = path.join(UPLOADS_DST_DIR, name);
      if (fs.existsSync(dstPath)) {
        return {
          found: true,
          override: {
            url: format.url,
            width: format.width,
            height: format.height,
            size: format.size,
          },
        };
      }

      const srcPath = path.join(UPLOADS_SRC_DIR, name);
      if (fs.existsSync(srcPath)) {
        fs.mkdirSync(UPLOADS_DST_DIR, { recursive: true });
        fs.copyFileSync(srcPath, dstPath);
        return {
          found: true,
          override: {
            url: format.url,
            width: format.width,
            height: format.height,
            size: format.size,
          },
        };
      }
    }
  }

  return { found: false };
};

export default async function importV3Dump(strapi: any) {
  if (!fs.existsSync(DUMP_DIR)) {
    throw new Error(`Dump folder not found at ${DUMP_DIR}`);
  }

  const getRawRows = (result: any) => {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.rows)) return result.rows;
    if (Array.isArray(result[0])) return result[0];
    return [];
  };

  const hasColumn = async (table: string, column: string) => {
    const client = strapi.db.connection?.client?.config?.client || '';
    if (client.includes('sqlite')) {
      const result = await strapi.db.connection.raw(`PRAGMA table_info(${table})`);
      const rows = getRawRows(result);
      return rows.some((row: any) => row.name === column);
    }

    const result = await strapi.db.connection.raw(
      `select column_name from information_schema.columns where table_name = ? and column_name = ?`,
      [table, column]
    );
    const rows = getRawRows(result);
    return rows.length > 0;
  };

  const ensureUserEmailColumn = async () => {
    const exists = await hasColumn('up_users', 'email');
    if (!exists) {
      await strapi.db.connection.schema.alterTable('up_users', (table: any) => {
        table.string('email');
      });
    }
  };

  const normalizeFilters = (filters: any): any => {
    if (!filters || typeof filters !== 'object') {
      return filters;
    }

    if (Array.isArray(filters)) {
      return filters.map(normalizeFilters);
    }

    if (filters.$or) {
      return { ...filters, $or: normalizeFilters(filters.$or) };
    }

    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        normalized[key] = normalizeFilters(value);
        continue;
      }

      normalized[key] = { $eq: value };
    }
    return normalized;
  };

  const findOneBy = async (uid: string, filters: any) => {
    const results = await strapi.entityService.findMany(uid, {
      filters: normalizeFilters(filters),
      pagination: { pageSize: 1 },
    });
    if (!Array.isArray(results)) {
      return null;
    }
    return results[0] || null;
  };

  const maps = {
    files: new Map<string, number>(),
    artists: new Map<string, number>(),
    cities: new Map<string, number>(),
    walls: new Map<string, number>(),
    styles: new Map<string, number>(),
    subjects: new Map<string, number>(),
    mediums: new Map<string, number>(),
    slides: new Map<string, number>(),
    forms: new Map<string, number>(),
    arts: new Map<string, number>(),
    users: new Map<string, number>(),
  };

  const getDocs = (name: string) => readBsonFile(path.join(DUMP_DIR, `${name}.bson`));

  const uploadFiles = getDocs('upload_file');
  for (const file of uploadFiles) {
    const foundInfo = copyUploadIfExists(file);
    if (!foundInfo.found) {
      continue;
    }

    const url = foundInfo.override?.url || file.url;
    const width = foundInfo.override?.width ?? file.width;
    const height = foundInfo.override?.height ?? file.height;
    const size = foundInfo.override?.size ?? file.size;

    const existing = await findOneBy('plugin::upload.file', {
      $or: [
        { hash: file.hash },
        { url },
        { name: file.name },
      ],
    });

    const created = existing
      ? existing
      : await strapi.entityService.create('plugin::upload.file', {
          data: {
            name: file.name,
            alternativeText: file.alternativeText,
            caption: file.caption,
            folder: null,
            folderPath: '/',
            width,
            height,
            formats: file.formats,
            hash: file.hash,
            ext: file.ext,
            mime: file.mime,
            size,
            url,
            previewUrl: file.previewUrl,
            provider: file.provider,
            provider_metadata: file.provider_metadata,
          },
        });

    maps.files.set(normalizeId(file._id), created.id);
  }

  const cities = getDocs('cities');
  for (const city of cities) {
    const existing = city.slug
      ? await findOneBy('api::city.city', { slug: city.slug })
      : null;

    const created = existing
      ? existing
      : await strapi.entityService.create('api::city.city', {
          data: {
            Title: city.Title,
            slug: city.slug,
          },
        });
    maps.cities.set(normalizeId(city._id), created.id);
  }

  const walls = getDocs('walls');
  for (const wall of walls) {
    const existing = wall.slug
      ? await findOneBy('api::wall.wall', { slug: wall.slug })
      : null;

    const created = existing
      ? existing
      : await strapi.entityService.create('api::wall.wall', {
          data: {
            Title: wall.Title,
            Description: wall.Description,
            slug: wall.slug,
            Address: wall.Address,
            Coordinates: wall.Coordinates,
            Website: wall.Website,
            Schedule: wall.Schedule,
            Phone: wall.Phone,
            city: maps.cities.get(normalizeId(wall.city)) || null,
            Images: mapIds(wall.Images, maps.files),
          },
        });
    maps.walls.set(normalizeId(wall._id), created.id);
  }

  const styles = getDocs('styles');
  for (const style of styles) {
    const existing = style.slug
      ? await findOneBy('api::style.style', { slug: style.slug })
      : null;

    const created = existing
      ? existing
      : await strapi.entityService.create('api::style.style', {
          data: {
            Title: style.Title,
            description: style.description,
            slug: style.slug,
            seotitle: style.seotitle,
          },
        });
    maps.styles.set(normalizeId(style._id), created.id);
  }

  const subjects = getDocs('subjects');
  for (const subject of subjects) {
    const existing = subject.slug
      ? await findOneBy('api::subject.subject', { slug: subject.slug })
      : null;

    const created = existing
      ? existing
      : await strapi.entityService.create('api::subject.subject', {
          data: {
            Title: subject.Title,
            Description: subject.Description,
            slug: subject.slug,
          },
        });
    maps.subjects.set(normalizeId(subject._id), created.id);
  }

  const mediums = getDocs('mediums');
  for (const medium of mediums) {
    const existing = medium.slug
      ? await findOneBy('api::medium.medium', { slug: medium.slug })
      : null;

    const created = existing
      ? existing
      : await strapi.entityService.create('api::medium.medium', {
          data: {
            title: medium.title,
            description: medium.description,
            slug: medium.slug,
          },
        });
    maps.mediums.set(normalizeId(medium._id), created.id);
  }

  const artists = getDocs('artists');
  for (const artist of artists) {
    const existing = artist.slug
      ? await findOneBy('api::artist.artist', { slug: artist.slug })
      : null;

    const created = existing
      ? existing
      : await strapi.entityService.create('api::artist.artist', {
          data: {
            full_name: artist.full_name,
            description: artist.description,
            email: normalizeEmail(artist.email),
            Phone: artist.Phone,
            slug: artist.slug,
            photos: mapIds(artist.photos, maps.files),
          },
        });
    maps.artists.set(normalizeId(artist._id), created.id);
  }

  const slides = getDocs('slides');
  for (const slide of slides) {
    const existing = slide.title
      ? await findOneBy('api::slide.slide', { title: slide.title })
      : null;

    const created = existing
      ? existing
      : await strapi.entityService.create('api::slide.slide', {
          data: {
            title: slide.title,
            text: slide.text,
            link: slide.link,
            button: slide.button,
            image: mapIds(slide.image, maps.files)[0] || null,
          },
        });
    maps.slides.set(normalizeId(slide._id), created.id);
  }

  const forms = getDocs('forms');
  for (const form of forms) {
    const created = await strapi.entityService.create('api::form.form', {
      data: {
        title: form.title,
        email: normalizeEmail(form.email),
        text: form.text,
        json: form.json,
        name: form.name,
        comment: form.comment,
        processed: form.processed,
        phone: form.phone,
      },
    });
    maps.forms.set(normalizeId(form._id), created.id);
  }

  const marquees = getDocs('marquees');
  if (marquees.length) {
    const existing = await findOneBy('api::marquee.marquee', {});
    if (!existing) {
      await strapi.entityService.create('api::marquee.marquee', {
        data: {
          text: marquees[0].text,
        },
      });
    }
  }

  const arts = getDocs('arts');
  for (const art of arts) {
    const existing = art.slug
      ? await findOneBy('api::art.art', { slug: art.slug })
      : null;

    const artData = {
      Title: art.Title,
      Description: art.Description,
      Articul: art.Articul,
      Materials: art.Materials,
      Year: art.Year,
      Owners_price: art.Owners_price,
      slug: art.slug,
      Price: art.Price,
      width: art.width,
      height: art.height,
      square: art.square,
      isSquare: art.isSquare,
      main: art.main,
      sold: art.sold,
      views: art.views,
      publishedAt: art.published_at || null,
      Artist: maps.artists.get(normalizeId(art.Artist)) || null,
      wall: maps.walls.get(normalizeId(art.wall)) || null,
      styles: mapIds(art.styles, maps.styles),
      subjects: mapIds(art.subjects, maps.subjects),
      mediums: mapIds(art.mediums, maps.mediums),
      Pictures: mapIds(art.Pictures, maps.files),
      video: mapIds(art.video, maps.files),
    };

    const created = existing
      ? await strapi.entityService.update('api::art.art', existing.id, { data: artData })
      : await strapi.entityService.create('api::art.art', { data: artData });
    maps.arts.set(normalizeId(art._id), created.id);
  }

  const users = getDocs('users-permissions_user');
  await ensureUserEmailColumn();
  const defaultRole = await strapi.entityService.findMany('plugin::users-permissions.role', {
    filters: { type: 'authenticated' },
    pagination: { pageSize: 1 },
  });
  const roleId = defaultRole[0]?.id || null;

  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) {
      continue;
    }

    const existing = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { email } });

    const created = existing
      ? existing
      : await strapi.entityService.create('plugin::users-permissions.user', {
          data: {
            username: user.username,
            email,
            provider: user.provider || 'local',
            confirmed: user.confirmed,
            blocked: user.blocked,
            role: roleId,
          },
        });
    maps.users.set(normalizeId(user._id), created.id);
  }

  for (const user of users) {
    const userId = maps.users.get(normalizeId(user._id));
    if (!userId) continue;

    const artsIds = mapIds(user.arts, maps.arts);
    if (artsIds.length === 0) continue;

    await strapi.entityService.update('plugin::users-permissions.user', userId, {
      data: { arts: artsIds },
    });
  }
}
