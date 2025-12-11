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
          color: 'red',
          width: 2,
        }),
      });

    this.layer = null;
  }

  /**
   * Calculates the slice of geometry from start to end (in meters)
   * @param {LineString} geometry
   * @param {number} start
   * @param {number} end
   * @returns {LineString}
   */
  calculateSliceOpenLayers(geometry, start, end) {
    let length = 0;
    const coordinates = [];

    geometry.forEachSegment((a, b) => {
      const segment = new LineString([a, b]);
      const segmentLength = getSphereLength(segment);

      if (length <= start && start < length + segmentLength) {
        // start is inside this segment
        coordinates.push(
          segment.getCoordinateAt((start - length) / segmentLength),
        );
      }

      if (start <= length + segmentLength && length + segmentLength <= end) {
        // whole segment endpoint is inside the slice
        coordinates.push(b.slice());
      }

      if (length <= end && end < length + segmentLength) {
        // end is inside this segment
        coordinates.push(
          segment.getCoordinateAt((end - length) / segmentLength),
        );
      }

      length += segmentLength;
    });

    return new LineString(coordinates);
  }

  /**
   * Calculates the slice of geometry from start to end (in meters) using Turf.js
   * @param {LineString} geometry - OpenLayers LineString
   * @param {number} start - start distance in meters
   * @param {number} end - end distance in meters
   * @param {ol.proj} mapProjection - the map projection object
   * @returns {LineString} - OpenLayers LineString slice
   */
  calculateSlice(geometry, start, end, mapProjection) {
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

    // Turf expects distances in meters if the coordinates are in WGS84 (lon/lat)
    const sliced = lineSliceAlong(geojsonLine, start, end, { units: 'meters' });

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
   */
  highlightSlice(geometry, start, end, map, useOpenLayers) {
    if (!map) {
      throw new Error('Map not provided');
    }

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
        this.calculateSliceOpenLayers(geometry, start, end),
      );
    } else {
      const mapProjection = map.getView().getProjection();
      feature = new Feature(
        this.calculateSlice(geometry, start, end, mapProjection),
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
