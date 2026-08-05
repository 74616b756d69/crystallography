import { fetchJson } from './http.js';
import type { GalleryImage } from '../types.js';

/** テストやオフライン検証でモックに向けられるよう、ベースURLを差し替え可能にする。 */
const WIKIPEDIA_BASE = process.env.WIKIPEDIA_BASE ?? 'https://{lang}.wikipedia.org';

function wikipediaOrigin(lang: 'ja' | 'en'): string {
  return WIKIPEDIA_BASE.replace('{lang}', lang);
}

type WikipediaSummaryPayload = {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

type CommonsImageInfo = {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string }>;
};

type CommonsQueryPayload = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: CommonsImageInfo[];
      }
    >;
  };
};

export type WikipediaSummary = {
  lang: 'ja' | 'en';
  title?: string;
  extract?: string;
  imageUrl?: string;
  thumbUrl?: string;
  pageUrl?: string;
};

/** 図版として使えない拡張子・アイコン類を弾く。 */
const EXCLUDED_PATTERN = /\.(svg|ogg|oga|ogv|webm|pdf|tif|tiff)$/i;
const EXCLUDED_KEYWORDS = ['icon', 'logo', 'commons-', 'disambig', 'wiki', 'question_book', 'edit-', 'symbol'];

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSummary(lang: 'ja' | 'en', title: string): Promise<WikipediaSummary> {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const payload = await fetchJson<WikipediaSummaryPayload>(
    `${wikipediaOrigin(lang)}/api/rest_v1/page/summary/${encoded}`,
  );

  return {
    lang,
    title: payload.title,
    extract: payload.extract,
    imageUrl: payload.originalimage?.source ?? payload.thumbnail?.source,
    thumbUrl: payload.thumbnail?.source ?? payload.originalimage?.source,
    pageUrl: payload.content_urls?.desktop?.page,
  };
}

/**
 * 日本語版を優先し、無ければ英語版にフォールバックして要約を取得する。
 * 解説文が日本語で取れると図鑑の中身が一気に厚くなる。
 */
export async function fetchWikipediaSummaries(
  scientificName: string,
  japaneseName?: string,
): Promise<{ ja?: WikipediaSummary; en?: WikipediaSummary }> {
  const jaCandidates = [japaneseName, scientificName].filter((value): value is string => Boolean(value));

  let ja: WikipediaSummary | undefined;
  for (const candidate of jaCandidates) {
    try {
      const summary = await fetchSummary('ja', candidate);
      if (summary.extract) {
        ja = summary;
        break;
      }
    } catch {
      // 日本語版に項目が無いのは普通なので、次の候補・英語版に任せる。
    }
  }

  let en: WikipediaSummary | undefined;
  try {
    en = await fetchSummary('en', scientificName);
  } catch {
    en = undefined;
  }

  return { ja, en };
}

/**
 * 記事に貼られている画像を Commons のメタデータ付きで集める。
 * 1種につき複数枚（骨格・復元図・産地写真など）が集まり、ギャラリー表示に使える。
 */
export async function fetchArticleImages(lang: 'ja' | 'en', title: string, limit = 6): Promise<GalleryImage[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '1',
    titles: title,
    generator: 'images',
    gimlimit: '24',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '960',
    origin: '*',
  });

  const payload = await fetchJson<CommonsQueryPayload>(`${wikipediaOrigin(lang)}/w/api.php?${params.toString()}`);
  const pages = Object.values(payload.query?.pages ?? {});
  const images: GalleryImage[] = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const fileTitle = page.title ?? '';
    if (!info?.url) {
      continue;
    }

    const normalized = fileTitle.toLowerCase();
    if (EXCLUDED_PATTERN.test(info.url) || EXCLUDED_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      continue;
    }

    const artist = info.extmetadata?.Artist?.value;
    const license = info.extmetadata?.LicenseShortName?.value;

    images.push({
      url: info.url,
      thumbUrl: info.thumburl ?? info.url,
      credit: artist ? stripHtml(artist) : undefined,
      license: license ? stripHtml(license) : undefined,
      sourceUrl: info.descriptionurl,
    });

    if (images.length >= limit) {
      break;
    }
  }

  return images;
}
