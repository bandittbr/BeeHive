import type { Express } from 'express';
import type { DatabaseManager } from '@beehive/platform/server';

/**
 * Niche video discovery routes.
 * Uses YouTube Data API v3 search (no OAuth needed, just API key).
 * Falls back to curated niche suggestions if no API key.
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? '';

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  url: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  description: string;
}

const NICHE_SUGGESTIONS = [
  {
    name: 'AI & Machine Learning',
    searchTerms: ['artificial intelligence tutorial', 'chatgpt tips', 'machine learning explained'],
    description: 'Cutting-edge AI content for tech-savvy audiences',
  },
  {
    name: 'Personal Finance',
    searchTerms: ['money saving tips', 'investing for beginners', 'side hustle ideas'],
    description: 'Financial literacy and wealth-building content',
  },
  {
    name: 'Fitness & Health',
    searchTerms: ['home workout no equipment', 'meal prep ideas', 'weight loss tips'],
    description: 'Health and fitness tips for everyday people',
  },
  {
    name: 'Productivity',
    searchTerms: ['productivity hacks', 'daily routine optimize', 'focus techniques'],
    description: 'Life hacks and productivity optimization',
  },
  {
    name: 'Tech Reviews',
    searchTerms: ['best gadgets 2024', 'phone review', 'tech under 100 dollars'],
    description: 'Gadget reviews and tech recommendations',
  },
  {
    name: 'Cooking & Recipes',
    searchTerms: ['easy recipes 5 minutes', 'cooking hacks', 'budget meals'],
    description: 'Quick and easy cooking content',
  },
  {
    name: 'Psychology & Self-improvement',
    searchTerms: ['psychology tricks', 'self improvement tips', 'body language explained'],
    description: 'Mindset and personal development',
  },
  {
    name: 'Space & Science',
    searchTerms: ['space documentary', 'science experiments', 'universe explained'],
    description: 'Mind-blowing science and space content',
  },
  {
    name: 'History',
    searchTerms: ['history mysteries', 'ancient civilizations', 'historical events explained'],
    description: 'Fascinating historical stories and facts',
  },
  {
    name: 'Coding & Web Dev',
    searchTerms: ['javascript tutorial', 'web development beginner', 'coding project ideas'],
    description: 'Programming tutorials and web development',
  },
];

async function searchYouTube(query: string, maxResults: number): Promise<YouTubeSearchResult[]> {
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    videoDuration: 'short',
    maxResults: String(maxResults),
    key: YOUTUBE_API_KEY,
    relevanceLanguage: 'en',
    order: 'relevance',
  });

  const searchResp = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`);
  if (!searchResp.ok) {
    throw new Error(`YouTube search failed: ${searchResp.status}`);
  }
  const searchData = await searchResp.json() as {
    items: Array<{
      id: { videoId: string };
      snippet: { title: string; description: string; thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } }; channelTitle: string; publishedAt: string };
    }>;
  };

  if (!searchData.items || searchData.items.length === 0) {
    return [];
  }

  const videoIds = searchData.items.map((item) => item.id.videoId).join(',');

  const statsParams = new URLSearchParams({
    part: 'contentDetails,statistics',
    id: videoIds,
    key: YOUTUBE_API_KEY,
  });

  const statsResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams.toString()}`);
  if (!statsResp.ok) {
    return searchData.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      duration: '',
      viewCount: '',
      description: item.snippet.description,
    }));
  }

  const statsData = await statsResp.json() as {
    items: Array<{
      id: string;
      contentDetails: { duration: string };
      statistics: { viewCount: string; likeCount: string; commentCount: string };
    }>;
  };

  const statsMap = new Map(statsData.items.map((item) => [item.id, item]));

  return searchData.items.map((item) => {
    const stats = statsMap.get(item.id.videoId);
    return {
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      duration: stats?.contentDetails?.duration ?? '',
      viewCount: stats?.statistics?.viewCount ?? '',
      description: item.snippet.description,
    };
  });
}

export function mountNicheRoutes(app: Express, _db: DatabaseManager): void {

  // GET /api/shorts/niche/search?q=<niche>&maxResults=10
  app.get('/api/shorts/niche/search', async (req, res) => {
    try {
      const query = (req.query.q as string ?? '').trim();
      const maxResults = Math.min(Math.max(parseInt(req.query.maxResults as string ?? '10', 10) || 10, 1), 50);

      if (!query) {
        res.status(400).json({ error: 'q parameter is required' });
        return;
      }

      if (!YOUTUBE_API_KEY) {
        res.json({
          query,
          apiKeyPresent: false,
          results: [],
          message: 'No YOUTUBE_API_KEY configured — showing curated suggestions instead',
          suggestions: NICHE_SUGGESTIONS.filter((n) =>
            n.searchTerms.some((t) => t.toLowerCase().includes(query.toLowerCase())) ||
            n.name.toLowerCase().includes(query.toLowerCase()),
          ),
        });
        return;
      }

      const results = await searchYouTube(query, maxResults);
      res.json({ query, apiKeyPresent: true, results });
    } catch (err) {
      console.error('[niche] Search error:', err);
      res.status(500).json({ error: 'Failed to search YouTube' });
    }
  });

  // GET /api/shorts/niche/suggestions
  app.get('/api/shorts/niche/suggestions', (_req, res) => {
    res.json(NICHE_SUGGESTIONS);
  });
}
