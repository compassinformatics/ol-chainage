import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { getLength as getSphereLength } from 'ol/sphere.js';
import lineSliceAlong from '@turf/line-slice-along';
import { transform } from 'ol/proj.js';

export function convertCoords(coords, fromProj, toProj) {
  const projectedCoords = [];

  coords.forEach((coord) => {
    projectedCoords.push(transform(coord, fromProj, toProj));
  });

  return projectedCoords;
}

/**
 * Turf measures on a sphere of radius 6371008.8 m, whereas geometries may be
 * projected geometries. Calculate the factor between the two so chainage distances can be
 * corrected.
 *
 * @param {Array<import("ol/coordinate.js").Coordinate>} coords4326
 * @param {number} [referenceLength] True length of the line in metres
 * @returns {number} Factor to multiply chainage distances by  or 1 if no
 *   referenceLength is supplied
 */
export function getChainageScale(coords4326, referenceLength) {
  if (!referenceLength) {
    return 1;
  }
  const spherical = getSphereLength(new LineString(coords4326), {
    projection: 'EPSG:4326',
  });
  return spherical / referenceLength;
}

export class LineSliceHighlight {
  /**
   * @param {Object} options
   * @param {Style} [options.style] Optional custom style
   */
  constructor(options = {}) {
    this.style =
      options.style ||
      new Style({
        stroke: new Stroke({
          color: 'deeppink',
          width: 4,
        }),
      });

    this.layer = null;
  }

  /**
   * Calculates the slice of geometry from start to end (in meters)
   * @param {LineString} geometry - OpenLayers LineString in EPSG:4326
   * @param {number} start - start distance in meters
   * @param {number} end - end distance in meters
   * @param {import("ol/proj/Projection.js").default} [mapProjection] - the
   *   projection to return the slice in. Defaults to EPSG:4326.
   * @param {number} [referenceLength] - true length of the line in metres.
   * @returns {LineString} - OpenLayers LineString slice
   */
  calculateSliceOpenLayers(
    geometry,
    start,
    end,
    mapProjection,
    referenceLength = 1,
  ) {
    const from = start * scale;
    const to = end * scale;

    let length = 0;
    const coordinates = [];

    geometry.forEachSegment((a, b) => {
      const segment = new LineString([a, b]);
      const segmentLength = getSphereLength(segment, {
        projection: 'EPSG:4326',
      });

      if (length <= from && from < length + segmentLength) {
        // start is inside this segment
        coordinates.push(
          segment.getCoordinateAt((from - length) / segmentLength),
        );
      }

      if (from <= length + segmentLength && length + segmentLength <= to) {
        // whole segment endpoint is inside the slice
        coordinates.push(b.slice());
      }

      if (length <= to && to < length + segmentLength) {
        // end is inside this segment
        coordinates.push(
          segment.getCoordinateAt((to - length) / segmentLength),
        );
      }

      length += segmentLength;
    });

    if (mapProjection && mapProjection.getCode() !== 'EPSG:4326') {
      return new LineString(
        convertCoords(coordinates, 'EPSG:4326', mapProjection),
      );
    }

    return new LineString(coordinates);
  }

  /**
   * Calculates the slice of geometry from start to end (in meters) using Turf.js
   * @param {LineString} geometry - OpenLayers LineString
   * @param {number} start - start distance in meters
   * @param {number} end - end distance in meters
   * @param {ol.proj} mapProjection - the map projection object
   * @param {number} [referenceLength] - true length of the line in metres
   * @returns {LineString} - OpenLayers LineString slice
   */
  calculateSlice(geometry, start, end, mapProjection, referenceLength = null) {
    // Convert OL LineString coordinates to GeoJSON LineString
    const coords = geometry.getCoordinates().map(([x, y]) => [x, y]);
    const geojsonLine = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
      properties: {},
    };

    const scale = getChainageScale(coords, referenceLength);

    // Turf expects distances in meters if the coordinates are in WGS84 (lon/lat)
    const sliced = lineSliceAlong(geojsonLine, start * scale, end * scale, {
      units: 'meters',
    });

    // Convert back to OpenLayers LineString

    if (mapProjection.getCode() !== 'EPSG:4326') {
      const projectedCoords = convertCoords(
        sliced.geometry.coordinates,
        'EPSG:4326',
        mapProjection,
      );
      return new LineString(projectedCoords);
    } else {
      return new LineString(sliced.geometry.coordinates);
    }
  }

  /**
   * Highlight a slice of the LineString on the map.
   * @param {LineString} geometry
   * @param {number} start
   * @param {number} end
   * @param {import("ol/Map").default} map
   * @param {boolean} [useOpenLayers] - use the OL slicing path instead of turf
   * @param {number} [referenceLength] - true length of the line in metres
   */
  highlightSlice(
    geometry,
    start,
    end,
    map,
    useOpenLayers = false,
    referenceLength = null,
  ) {
    if (!map) {
      throw new Error('Map not provided');
    }

    const mapProjection = map.getView().getProjection();

    if (!this.layer) {
      this.layer = new VectorLayer({
        style: this.style,
        source: new VectorSource(),
        map,
      });
    } else {
      this.layer.getSource().clear();
    }

    let feature;

    if (useOpenLayers === true) {
      feature = new Feature(
        this.calculateSliceOpenLayers(
          geometry,
          start,
          end,
          mapProjection,
          referenceLength,
        ),
      );
    } else {
      feature = new Feature(
        this.calculateSlice(
          geometry,
          start,
          end,
          mapProjection,
          referenceLength,
        ),
      );
    }

    this.layer.getSource().addFeature(feature);
  }

  /**
   * Remove highlight from map.
   */
  removeHighlight() {
    if (this.layer) {
      this.layer.setMap(null);
      this.layer = null;
    }
  }

  /**
   * Set style on the highlight.
   * @param {Style} style
   */
  setStyle(style) {
    this.style = style;
    if (this.layer) {
      this.layer.setStyle(style);
    }
  }

  /**
   * Cleanup.
   */
  destroy() {
    this.removeHighlight();
    this.style = null;
  }
}
