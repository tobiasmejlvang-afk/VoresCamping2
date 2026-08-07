(() => {
  'use strict';

  const DEFAULT_BASE = 'https://api.openrouteservice.org';
  const ALT_BASE = 'https://api.heigit.org/openrouteservice';
  const VERSION = '24.1';

  const PROFILES = Object.freeze({
    'driving-car': {label:'Bil', icon:'🚗', group:'Kørsel'},
    'driving-hgv': {label:'Autocamper / tungt køretøj', icon:'🚐', group:'Kørsel'},
    'cycling-regular': {label:'Almindelig cykel', icon:'🚲', group:'Cykling'},
    'cycling-electric': {label:'Elcykel', icon:'⚡', group:'Cykling'},
    'cycling-road': {label:'Landevejscykel', icon:'🏁', group:'Cykling'},
    'cycling-mountain': {label:'Mountainbike', icon:'⛰️', group:'Cykling'},
    'foot-walking': {label:'Gåtur', icon:'🚶', group:'Til fods'},
    'foot-hiking': {label:'Vandring', icon:'🥾', group:'Til fods'},
    'wheelchair': {label:'Kørestol', icon:'♿', group:'Til fods'}
  });

  const POI_PRESETS = Object.freeze({
    camping: {label:'Camping og autocamper', categoryIds:[103,104]},
    essentials: {label:'Praktisk på turen', categoryIds:[166,179,208,518,565,596,601,603]},
    food: {label:'Mad og café', categoryIds:[435,564,570]},
    cycling: {label:'Cykelservice', categoryIds:[429,583,584,585]},
    family: {label:'Udflugter og oplevelser', categoryIds:[134,263,281,291,292,332,622,625,627]},
    dog: {label:'Hundevenligt', categoryIds:[123,268]},
    allTravel: {label:'Alt relevant på ferien', categoryGroupIds:[100,130,160,200,260,330,420,560,580,620]}
  });

  const CAPABILITIES = Object.freeze([
    'autocomplete','geocode','structured','reverse',
    'directions-geojson','directions-json','directions-gpx','directions-get',
    'snap-json','snap-geojson','isochrones','matrix','pois',
    'elevation-point-get','elevation-point-post','elevation-line','optimization',
    'route-extra-info','route-attributes','round-trip','alternative-routes',
    'pois-around','poi-stats-around','isochrone-around','matrix-from-origin'
  ]);

  function normalizeBase(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function uniqueBases(config = {}) {
    return [normalizeBase(config.baseUrl) || DEFAULT_BASE, ALT_BASE]
      .map(normalizeBase)
      .filter((value, index, all) => value && all.indexOf(value) === index);
  }

  function requireApiKey(config = {}) {
    const key = String(config.apiKey || '').trim();
    if (!key) throw new Error('Openrouteservice API-nøglen mangler. Indsæt den under Indstillinger → Ruteplanlægning.');
    return key;
  }

  function parseError(data, status) {
    const candidate = data?.error?.message || data?.error?.details || data?.message || data?.error;
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (candidate && typeof candidate === 'object') {
      try { return JSON.stringify(candidate); } catch (_) {}
    }
    return `Openrouteservice svarede med HTTP ${status}.`;
  }

  async function parseResponse(response, responseType = 'json') {
    if (responseType === 'blob') return response.blob();
    const raw = await response.text();
    if (responseType === 'text') return raw;
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return raw; }
  }

  function addQuery(url, query = {}) {
    Object.entries(query).forEach(([name, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) value.forEach(item => url.searchParams.append(name, String(item)));
      else url.searchParams.set(name, String(value));
    });
  }

  async function request(path, options = {}, config = {}, responseType = 'json') {
    const key = requireApiKey(config);
    const method = String(options.method || 'GET').toUpperCase();
    let lastError = null;

    for (const base of uniqueBases(config)) {
      const controller = new AbortController();
      const timeout = Math.max(3000, Number(config.timeout || 25000));
      const timer = window.setTimeout(() => controller.abort(), timeout);
      try {
        const url = new URL(base + path);
        addQuery(url, options.query || {});
        const headers = {
          Accept: responseType === 'text' ? '*/*' : 'application/json',
          Authorization: key,
          ...(options.headers || {})
        };
        if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        const response = await fetch(url, {
          method,
          headers,
          body: options.body,
          signal: controller.signal,
          cache: 'no-store'
        });
        const data = await parseResponse(response, responseType);
        if (!response.ok) {
          const error = new Error(parseError(data, response.status));
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data;
      } catch (error) {
        lastError = error?.name === 'AbortError'
          ? new Error('Openrouteservice brugte for lang tid på at svare.')
          : error;
        const status = Number(lastError?.status || 0);
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) break;
      } finally {
        window.clearTimeout(timer);
      }
    }
    throw lastError || new Error('Openrouteservice kunne ikke kontaktes.');
  }

  function requestJson(path, body, config, options = {}) {
    return request(path, {
      method:'POST',
      body: JSON.stringify(body),
      headers: options.headers,
      query: options.query
    }, config, options.responseType || 'json');
  }

  function geocodeRequest(endpoint, params, config = {}) {
    return request(endpoint, {method:'GET', query:params}, config);
  }

  function cleanObject(value) {
    if (Array.isArray(value)) return value.map(cleanObject).filter(item => item !== undefined);
    if (!value || typeof value !== 'object') return value;
    const result = {};
    Object.entries(value).forEach(([key, item]) => {
      if (item === undefined || item === null || item === '') return;
      if (Array.isArray(item) && !item.length) return;
      const cleaned = cleanObject(item);
      if (cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned) && !Object.keys(cleaned).length) return;
      result[key] = cleaned;
    });
    return result;
  }

  function assertProfile(profile) {
    const value = String(profile || 'cycling-regular');
    if (!PROFILES[value]) throw new Error(`ORS-profilen “${value}” understøttes ikke i appen.`);
    return value;
  }

  function assertPoints(points, minimum = 1) {
    if (!Array.isArray(points) || points.length < minimum) throw new Error(`Der kræves mindst ${minimum} koordinat${minimum === 1 ? '' : 'er'}.`);
    points.forEach(point => {
      if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(Number(point[0])) || !Number.isFinite(Number(point[1]))) {
        throw new Error('Koordinater skal angives som [længdegrad, breddegrad].');
      }
    });
    return points.map(point => [Number(point[0]), Number(point[1])]);
  }

  function buildDirectionsBody(points, options = {}) {
    const routeOptions = {...(options.routeOptions || options.options || {})};
    if (options.avoidFeatures?.length) routeOptions.avoid_features = options.avoidFeatures;
    if (options.roundTrip) routeOptions.round_trip = cleanObject(options.roundTrip);
    if (options.vehicleType) routeOptions.vehicle_type = options.vehicleType;
    if (options.profileParams) routeOptions.profile_params = options.profileParams;

    return cleanObject({
      coordinates: assertPoints(points, 2),
      preference: options.preference || 'recommended',
      units: options.units || 'm',
      language: options.language || 'da',
      geometry: options.geometry !== false,
      geometry_simplify: Boolean(options.geometrySimplify),
      elevation: options.elevation !== false,
      instructions: options.instructions !== false,
      instructions_format: options.instructionsFormat || 'text',
      maneuvers: Boolean(options.maneuvers),
      roundabout_exits: Boolean(options.roundaboutExits),
      continue_straight: options.continueStraight,
      suppress_warnings: options.suppressWarnings,
      radiuses: options.radiuses,
      bearings: options.bearings,
      skip_segments: options.skipSegments,
      attributes: options.attributes,
      extra_info: options.extraInfo || options.extra_info,
      alternative_routes: options.alternativeRoutes,
      maximum_speed: options.maximumSpeed,
      options: routeOptions,
      ...(options.body || {})
    });
  }

  function poiFilters(options = {}) {
    if (options.filters) return options.filters;
    const preset = POI_PRESETS[options.preset || 'allTravel'] || POI_PRESETS.allTravel;
    return cleanObject({
      category_group_ids: preset.categoryGroupIds,
      category_ids: preset.categoryIds,
      name: options.name,
      wheelchair: options.wheelchair,
      smoking: options.smoking,
      fee: options.fee
    });
  }

  function normalizeRouteSummary(result) {
    const feature = result?.features?.[0];
    const route = result?.routes?.[0];
    const props = feature?.properties || {};
    const summary = props.summary || route?.summary || {};
    return {
      distanceM: Number(summary.distance || 0),
      durationS: Number(summary.duration || 0),
      ascentM: Number(props.ascent ?? summary.ascent ?? route?.ascent ?? 0),
      descentM: Number(props.descent ?? summary.descent ?? route?.descent ?? 0),
      averageSpeedKmh: Number(props.attributes?.avgspeed ?? route?.attributes?.avgspeed ?? 0),
      bbox: result?.bbox || route?.bbox || null,
      warnings: props.warnings || route?.warnings || [],
      extras: props.extras || route?.extras || {}
    };
  }

  function createClient(getConfig) {
    const cfg = () => typeof getConfig === 'function' ? (getConfig() || {}) : (getConfig || {});

    const client = {
      version: VERSION,
      profiles: PROFILES,
      poiPresets: POI_PRESETS,
      capabilities: CAPABILITIES,
      normalizeRouteSummary,

      geocode(text, options = {}) {
        const params = {
          text,
          size: options.size || 8,
          layers: options.layers,
          sources: options.sources,
          lang: options.lang || 'da',
          'boundary.country': options.country,
          'boundary.rect.min_lon': options.bounds?.[0]?.[0],
          'boundary.rect.min_lat': options.bounds?.[0]?.[1],
          'boundary.rect.max_lon': options.bounds?.[1]?.[0],
          'boundary.rect.max_lat': options.bounds?.[1]?.[1]
        };
        if (options.focus) {
          params['focus.point.lon'] = options.focus.lng;
          params['focus.point.lat'] = options.focus.lat;
        }
        return geocodeRequest('/geocode/search', cleanObject(params), cfg());
      },

      autocomplete(text, options = {}) {
        const params = {text, size:options.size || 8, lang:options.lang || 'da', layers:options.layers, sources:options.sources};
        if (options.focus) {
          params['focus.point.lon'] = options.focus.lng;
          params['focus.point.lat'] = options.focus.lat;
        }
        return geocodeRequest('/geocode/autocomplete', cleanObject(params), cfg());
      },

      structuredGeocode(fields = {}, options = {}) {
        return geocodeRequest('/geocode/search/structured', cleanObject({...fields, size:options.size || 8, lang:options.lang || 'da'}), cfg());
      },

      reverseGeocode(lng, lat, options = {}) {
        return geocodeRequest('/geocode/reverse', cleanObject({
          'point.lon': Number(lng),
          'point.lat': Number(lat),
          size: options.size || 1,
          radius: options.radius,
          layers: options.layers,
          lang: options.lang || 'da'
        }), cfg());
      },

      directions(points, profile = 'cycling-regular', options = {}) {
        return this.directionsGeoJSON(points, profile, options);
      },

      directionsGeoJSON(points, profile = 'cycling-regular', options = {}) {
        return requestJson(`/v2/directions/${assertProfile(profile)}/geojson`, buildDirectionsBody(points, options), cfg());
      },

      directionsJson(points, profile = 'cycling-regular', options = {}) {
        return requestJson(`/v2/directions/${assertProfile(profile)}/json`, buildDirectionsBody(points, options), cfg());
      },

      directionsGpx(points, profile = 'cycling-regular', options = {}) {
        return requestJson(`/v2/directions/${assertProfile(profile)}/gpx`, buildDirectionsBody(points, {...options, instructions:true}), cfg(), {
          responseType:'text',
          headers:{Accept:'application/gpx+xml, application/xml, text/xml'}
        });
      },

      directionsSimple(start, end, profile = 'cycling-regular') {
        const from = assertPoints([start], 1)[0].join(',');
        const to = assertPoints([end], 1)[0].join(',');
        return request(`/v2/directions/${assertProfile(profile)}`, {method:'GET', query:{start:from,end:to}}, cfg());
      },

      snap(points, profile = 'cycling-regular', radius = 400) {
        return this.snapGeoJSON(points, profile, radius);
      },

      snapJson(points, profile = 'cycling-regular', radius = 400) {
        return requestJson(`/v2/snap/${assertProfile(profile)}/json`, {locations:assertPoints(points,1), radius:Number(radius)}, cfg());
      },

      snapGeoJSON(points, profile = 'cycling-regular', radius = 400) {
        return requestJson(`/v2/snap/${assertProfile(profile)}/geojson`, {locations:assertPoints(points,1), radius:Number(radius)}, cfg());
      },

      isochrones(points, profile = 'cycling-regular', ranges = [900,1800], options = {}) {
        return requestJson(`/v2/isochrones/${assertProfile(profile)}`, cleanObject({
          locations: assertPoints(points, 1),
          range: ranges.map(Number),
          range_type: options.rangeType || 'time',
          interval: options.interval,
          location_type: options.locationType || 'start',
          smoothing: options.smoothing,
          attributes: options.attributes,
          area_units: options.areaUnits,
          units: options.units,
          intersections: options.intersections,
          options: cleanObject({
            ...(options.routeOptions || options.options || {}),
            avoid_features: options.avoidFeatures,
            round_trip: options.roundTrip
          }),
          ...(options.body || {})
        }), cfg());
      },

      matrix(points, profile = 'cycling-regular', options = {}) {
        return requestJson(`/v2/matrix/${assertProfile(profile)}`, cleanObject({
          locations: assertPoints(points, 2),
          metrics: options.metrics || ['distance','duration'],
          sources: options.sources,
          destinations: options.destinations,
          resolve_locations: Boolean(options.resolveLocations),
          units: options.units || 'm',
          optimized: options.optimized,
          fallback_speed: options.fallbackSpeed,
          ...(options.body || {})
        }), cfg());
      },

      pois(geometry, options = {}) {
        return requestJson('/pois', cleanObject({
          request:'pois',
          geometry,
          limit: Math.min(100, Math.max(1, Number(options.limit || 20))),
          sortby: options.sortby || 'distance',
          filters: poiFilters(options)
        }), cfg());
      },

      poisAround(lng, lat, radius = 1500, options = {}) {
        const buffer = Math.min(2000, Math.max(50, Number(radius || 1500)));
        return this.pois({
          geojson:{type:'Point',coordinates:[Number(lng),Number(lat)]},
          buffer
        }, options);
      },

      poiStats(geometry, options = {}) {
        return requestJson('/pois', cleanObject({
          request:'stats',
          geometry,
          filters: poiFilters(options)
        }), cfg());
      },

      poiStatsAround(lng, lat, radius = 1500, options = {}) {
        const buffer = Math.min(2000, Math.max(50, Number(radius || 1500)));
        return this.poiStats({
          geojson:{type:'Point',coordinates:[Number(lng),Number(lat)]},
          buffer
        }, options);
      },

      isochroneAround(lng, lat, profile = 'cycling-regular', ranges = [900,1800], options = {}) {
        return this.isochrones([[Number(lng),Number(lat)]], profile, ranges, options);
      },

      matrixFromOrigin(origin, destinations, profile = 'driving-car', options = {}) {
        const points=[origin,...(destinations||[])];
        return this.matrix(points, profile, {...options,sources:['0'],destinations:points.slice(1).map((_,index)=>String(index+1))});
      },

      elevationPoint(coordinates, formatIn = 'point', formatOut = 'point') {
        return requestJson('/elevation/point', {format_in:formatIn, format_out:formatOut, geometry:coordinates}, cfg());
      },

      elevationPointGet(lng, lat, options = {}) {
        const geometry = `${Number(lng)},${Number(lat)}`;
        return request('/elevation/point', {method:'GET', query:{geometry, format_out:options.formatOut || 'point'}}, cfg());
      },

      elevationLine(geometry, formatIn = 'geojson', formatOut = 'geojson') {
        return requestJson('/elevation/line', {format_in:formatIn, format_out:formatOut, geometry}, cfg());
      },

      optimization(jobs, vehicles, options = {}) {
        return requestJson('/optimization', cleanObject({jobs, vehicles, ...options}), cfg());
      },

      async test() {
        const result = await this.geocode('Holstebro, Danmark', {size:1});
        return Array.isArray(result?.features) && result.features.length > 0;
      },

      async testRouting() {
        const result = await this.directionsSimple([8.6153,56.3601],[8.6182,56.3632],'cycling-regular');
        return Boolean(result?.features?.length);
      }
    };

    return client;
  }

  window.VCORS = {
    createClient,
    DEFAULT_BASE,
    ALT_BASE,
    VERSION,
    PROFILES,
    POI_PRESETS,
    CAPABILITIES,
    normalizeRouteSummary
  };
})();
