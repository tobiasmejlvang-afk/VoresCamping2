(() => {
  'use strict';

  const DEFAULT_BASE = 'https://api.openrouteservice.org';
  const ALT_BASE = 'https://api.heigit.org/openrouteservice';
  const VERSION = '23';

  function uniqueBases(config = {}) {
    return [config.baseUrl || DEFAULT_BASE, ALT_BASE]
      .map(value => String(value || '').replace(/\/$/, ''))
      .filter((value, index, all) => value && all.indexOf(value) === index);
  }

  async function parseResponse(response, responseType = 'json') {
    if (responseType === 'text') return response.text();
    const raw = await response.text();
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return raw; }
  }

  async function request(path, options = {}, config = {}, responseType = 'json') {
    const key = String(config.apiKey || '').trim();
    if (!key) throw new Error('Openrouteservice API-nøglen mangler. Indsæt den under Indstillinger → Ruteplanlægning.');

    let lastError = null;
    for (const base of uniqueBases(config)) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), Number(config.timeout || 20000));
      try {
        const headers = {
          Accept: responseType === 'text' ? '*/*' : 'application/json',
          Authorization: key,
          ...(options.headers || {})
        };
        if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        const response = await fetch(base + path, {...options, headers, signal: controller.signal});
        const data = await parseResponse(response, responseType);
        if (!response.ok) {
          const message = data?.error?.message || data?.message || data?.error || `Openrouteservice svarede med ${response.status}.`;
          throw new Error(String(message));
        }
        return data;
      } catch (error) {
        lastError = error?.name === 'AbortError' ? new Error('Openrouteservice brugte for lang tid på at svare.') : error;
      } finally {
        window.clearTimeout(timer);
      }
    }
    throw lastError || new Error('Openrouteservice kunne ikke kontaktes.');
  }

  async function geocodeRequest(endpoint, params, config = {}) {
    const key = String(config.apiKey || '').trim();
    if (!key) throw new Error('Openrouteservice API-nøglen mangler.');
    const base = uniqueBases(config)[0] || DEFAULT_BASE;
    const url = new URL(base + endpoint);
    url.searchParams.set('api_key', key);
    Object.entries(params || {}).forEach(([name, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(name, String(value));
    });
    const response = await fetch(url, {headers:{Accept:'application/json'}});
    const data = await parseResponse(response);
    if (!response.ok) throw new Error(data?.error?.message || data?.message || 'Geokodningen kunne ikke gennemføres.');
    return data;
  }

  function createClient(getConfig) {
    const cfg = () => typeof getConfig === 'function' ? (getConfig() || {}) : (getConfig || {});

    return {
      version: VERSION,
      capabilities: ['autocomplete','geocode','structured','reverse','directions','gpx','snap','isochrones','matrix','pois','elevation','optimization'],

      geocode(text, options = {}) {
        const params = {text, size: options.size || 8};
        if (options.focus) {
          params['focus.point.lon'] = options.focus.lng;
          params['focus.point.lat'] = options.focus.lat;
        }
        if (options.country) params['boundary.country'] = options.country;
        return geocodeRequest('/geocode/search', params, cfg());
      },

      autocomplete(text, options = {}) {
        return geocodeRequest('/geocode/autocomplete', {text, size: options.size || 8}, cfg());
      },

      structuredGeocode(fields = {}, options = {}) {
        return geocodeRequest('/geocode/search/structured', {...fields, size: options.size || 8}, cfg());
      },

      reverseGeocode(lng, lat, options = {}) {
        return geocodeRequest('/geocode/reverse', {
          'point.lon': lng,
          'point.lat': lat,
          size: options.size || 1
        }, cfg());
      },

      directions(points, profile = 'cycling-regular', options = {}) {
        return request(`/v2/directions/${profile}/geojson`, {
          method: 'POST',
          body: JSON.stringify({
            coordinates: points,
            elevation: options.elevation !== false,
            instructions: Boolean(options.instructions),
            preference: options.preference,
            options: options.routeOptions,
            ...(options.body || {})
          })
        }, cfg());
      },

      directionsGpx(points, profile = 'cycling-regular', options = {}) {
        return request(`/v2/directions/${profile}/gpx`, {
          method: 'POST',
          headers: {Accept:'application/gpx+xml'},
          body: JSON.stringify({coordinates: points, elevation: true, instructions: true, ...(options.body || {})})
        }, cfg(), 'text');
      },

      snap(points, profile = 'cycling-regular', radius = 400) {
        return request(`/v2/snap/${profile}/geojson`, {
          method:'POST',
          body:JSON.stringify({locations:points, radius})
        }, cfg());
      },

      isochrones(points, profile = 'cycling-regular', ranges = [900,1800], options = {}) {
        return request(`/v2/isochrones/${profile}`, {
          method:'POST',
          body:JSON.stringify({
            locations:points,
            range:ranges,
            range_type:options.rangeType || 'time',
            location_type:options.locationType || 'start',
            ...(options.body || {})
          })
        }, cfg());
      },

      matrix(points, profile = 'cycling-regular', options = {}) {
        return request(`/v2/matrix/${profile}`, {
          method:'POST',
          body:JSON.stringify({
            locations:points,
            metrics:options.metrics || ['distance','duration'],
            sources:options.sources,
            destinations:options.destinations,
            resolve_locations:Boolean(options.resolveLocations)
          })
        }, cfg());
      },

      pois(geometry, options = {}) {
        return request('/pois', {
          method:'POST',
          body:JSON.stringify({
            request:'pois',
            geometry,
            limit:options.limit || 12,
            sortby:options.sortby || 'distance',
            filters:options.filters || {category_group_ids:[100,120,130,140,180]}
          })
        }, cfg());
      },

      elevationPoint(coordinates, formatIn = 'point', formatOut = 'point') {
        return request('/elevation/point', {
          method:'POST',
          body:JSON.stringify({format_in:formatIn, format_out:formatOut, geometry:coordinates})
        }, cfg());
      },

      elevationLine(geometry, formatIn = 'geojson', formatOut = 'geojson') {
        return request('/elevation/line', {
          method:'POST',
          body:JSON.stringify({format_in:formatIn, format_out:formatOut, geometry})
        }, cfg());
      },

      optimization(jobs, vehicles, options = {}) {
        return request('/optimization', {
          method:'POST',
          body:JSON.stringify({jobs, vehicles, ...options})
        }, cfg());
      },

      async test() {
        const result = await this.geocode('Holstebro, Danmark', {size:1});
        return Array.isArray(result?.features) && result.features.length > 0;
      }
    };
  }

  window.VCORS = {createClient, DEFAULT_BASE, ALT_BASE, VERSION};
})();
