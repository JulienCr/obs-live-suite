import { buildYouTubeEmbedUrl } from '@/lib/utils/youtubeUrlBuilder';

/** Helper: parse URL and return its searchParams for clean assertions */
function getParams(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

/** Helper: extract the pathname (videoId portion) from the URL */
function getPath(url: string): string {
  return new URL(url).pathname;
}

describe('buildYouTubeEmbedUrl', () => {
  const VIDEO_ID = 'dQw4w9WgXcQ';

  describe('default parameters (only videoId)', () => {
    it('should use the correct base URL with video ID in path', () => {
      const url = buildYouTubeEmbedUrl({ videoId: VIDEO_ID });
      expect(getPath(url)).toBe(`/embed/${VIDEO_ID}`);
      expect(url.startsWith('https://www.youtube.com/embed/')).toBe(true);
    });

    it('should set autoplay=1 by default', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.get('autoplay')).toBe('1');
    });

    it('should set mute=1 by default', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.get('mute')).toBe('1');
    });

    it('should set controls=0 by default', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.get('controls')).toBe('0');
    });

    it('should set enablejsapi=1 by default', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.get('enablejsapi')).toBe('1');
    });

    it('should not include start, end, loop, playlist, or origin params', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.has('start')).toBe(false);
      expect(params.has('end')).toBe(false);
      expect(params.has('loop')).toBe(false);
      expect(params.has('playlist')).toBe(false);
      expect(params.has('origin')).toBe(false);
    });
  });

  describe('boolean toggles', () => {
    it('should set autoplay=0 when autoplay is false', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, autoplay: false }));
      expect(params.get('autoplay')).toBe('0');
    });

    it('should set mute=0 when mute is false', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, mute: false }));
      expect(params.get('mute')).toBe('0');
    });

    it('should set controls=1 when controls is true', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, controls: true }));
      expect(params.get('controls')).toBe('1');
    });

    it('should set autoplay=1 when autoplay is explicitly true', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, autoplay: true }));
      expect(params.get('autoplay')).toBe('1');
    });

    it('should set mute=1 when mute is explicitly true', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, mute: true }));
      expect(params.get('mute')).toBe('1');
    });

    it('should set controls=0 when controls is explicitly false', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, controls: false }));
      expect(params.get('controls')).toBe('0');
    });
  });

  describe('enablejsapi parameter', () => {
    it('should include enablejsapi=1 when enablejsapi is explicitly true', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, enablejsapi: true }));
      expect(params.get('enablejsapi')).toBe('1');
    });

    it('should NOT include enablejsapi param at all when enablejsapi is false', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, enablejsapi: false }));
      expect(params.has('enablejsapi')).toBe(false);
    });
  });

  describe('origin parameter', () => {
    it('should include origin when provided', () => {
      const params = getParams(
        buildYouTubeEmbedUrl({ videoId: VIDEO_ID, origin: 'http://localhost:3000' })
      );
      expect(params.get('origin')).toBe('http://localhost:3000');
    });

    it('should not include origin when not provided', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.has('origin')).toBe(false);
    });
  });

  describe('timing parameters', () => {
    it('should floor startTime to an integer', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, startTime: 10.7 }));
      expect(params.get('start')).toBe('10');
    });

    it('should ceil endTime to an integer', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, endTime: 30.2 }));
      expect(params.get('end')).toBe('31');
    });

    it('should handle startTime=0 correctly', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, startTime: 0 }));
      expect(params.get('start')).toBe('0');
    });

    it('should handle integer startTime without rounding', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, startTime: 15 }));
      expect(params.get('start')).toBe('15');
    });

    it('should handle integer endTime without rounding', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID, endTime: 60 }));
      expect(params.get('end')).toBe('60');
    });

    it('should not include start when startTime is undefined', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.has('start')).toBe(false);
    });

    it('should not include end when endTime is undefined', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.has('end')).toBe(false);
    });
  });

  describe('endBehavior loop', () => {
    it('should add loop=1 and playlist={videoId} when endBehavior is "loop"', () => {
      const params = getParams(
        buildYouTubeEmbedUrl({ videoId: VIDEO_ID, endBehavior: 'loop' })
      );
      expect(params.get('loop')).toBe('1');
      expect(params.get('playlist')).toBe(VIDEO_ID);
    });

    it('should not add loop or playlist when endBehavior is "stop"', () => {
      const params = getParams(
        buildYouTubeEmbedUrl({ videoId: VIDEO_ID, endBehavior: 'stop' })
      );
      expect(params.has('loop')).toBe(false);
      expect(params.has('playlist')).toBe(false);
    });

    it('should not add loop or playlist when endBehavior is not specified (default "stop")', () => {
      const params = getParams(buildYouTubeEmbedUrl({ videoId: VIDEO_ID }));
      expect(params.has('loop')).toBe(false);
      expect(params.has('playlist')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined optional params correctly', () => {
      const url = buildYouTubeEmbedUrl({
        videoId: VIDEO_ID,
        startTime: undefined,
        endTime: undefined,
        endBehavior: undefined,
        autoplay: undefined,
        mute: undefined,
        controls: undefined,
        enablejsapi: undefined,
        origin: undefined,
      });
      const params = getParams(url);

      // Defaults should apply
      expect(params.get('autoplay')).toBe('1');
      expect(params.get('mute')).toBe('1');
      expect(params.get('controls')).toBe('0');
      expect(params.get('enablejsapi')).toBe('1');

      // Optional params should be absent
      expect(params.has('start')).toBe(false);
      expect(params.has('end')).toBe(false);
      expect(params.has('loop')).toBe(false);
      expect(params.has('playlist')).toBe(false);
      expect(params.has('origin')).toBe(false);
    });

    it('should produce a valid URL that can be parsed by the URL constructor', () => {
      const url = buildYouTubeEmbedUrl({ videoId: VIDEO_ID });
      expect(() => new URL(url)).not.toThrow();
    });
  });

  describe('combined options', () => {
    it('should produce a correct URL with all options specified', () => {
      const url = buildYouTubeEmbedUrl({
        videoId: VIDEO_ID,
        startTime: 10.7,
        endTime: 30.2,
        endBehavior: 'loop',
        autoplay: false,
        mute: false,
        controls: true,
        enablejsapi: true,
        origin: 'http://localhost:3000',
      });

      expect(getPath(url)).toBe(`/embed/${VIDEO_ID}`);

      const params = getParams(url);
      expect(params.get('autoplay')).toBe('0');
      expect(params.get('mute')).toBe('0');
      expect(params.get('controls')).toBe('1');
      expect(params.get('enablejsapi')).toBe('1');
      expect(params.get('origin')).toBe('http://localhost:3000');
      expect(params.get('start')).toBe('10');
      expect(params.get('end')).toBe('31');
      expect(params.get('loop')).toBe('1');
      expect(params.get('playlist')).toBe(VIDEO_ID);
    });

    it('should handle loop with timing parameters together', () => {
      const params = getParams(
        buildYouTubeEmbedUrl({
          videoId: VIDEO_ID,
          startTime: 5,
          endTime: 20,
          endBehavior: 'loop',
        })
      );
      expect(params.get('start')).toBe('5');
      expect(params.get('end')).toBe('20');
      expect(params.get('loop')).toBe('1');
      expect(params.get('playlist')).toBe(VIDEO_ID);
    });

    it('should handle enablejsapi=false combined with other options', () => {
      const params = getParams(
        buildYouTubeEmbedUrl({
          videoId: VIDEO_ID,
          enablejsapi: false,
          origin: 'http://localhost:3000',
          startTime: 10,
        })
      );
      expect(params.has('enablejsapi')).toBe(false);
      expect(params.get('origin')).toBe('http://localhost:3000');
      expect(params.get('start')).toBe('10');
    });
  });
});
