import { lineString } from '@turf/helpers';
import destination from '@turf/destination';
import along from '@turf/along';
import { bearing } from '@turf/bearing';
import length from '@turf/length';
import { cleanCoords } from '@turf/clean-coords';
import { getChainageScale } from './highlight.js';
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import Fill from 'ol/style/Fill.js';
import Text from 'ol/style/Text.js';
import { transform } from 'ol/proj.js';
import { Stroke, Style } from 'ol/style';

/**
 * Build chainage tick features along a line.
 *
 * @param {Array<import("ol/coordinate.js").Coordinate>} lineCoords - line in EPSG:4326
 * @param {import("ol/proj/Projection.js").default} mapProjection - projection to return ticks in
 * @param {number} [referenceLength] - true length of the line in metres.
 * @param {number} [interval] - spacing between ticks in metres
 * @param {number} [tickLength] - length of each tick mark in metres
 * @returns {Array<Feature>}
 */
export function addChainageMarkers(
  lineCoords,
  mapProjection,
  referenceLength = null,
  interval = 10,
  tickLength = 5,
) {
  if (!lineCoords || lineCoords.length < 2) {
    return [];
  }
  // convert ol geometry to Turf LineString
  const turfLine = cleanCoords(lineString(lineCoords));
  const totalLength = length(turfLine, { units: 'meters' });
  if (totalLength <= 0) {
    return [];
  }

  // turf positions ticks on a sphere of radius 6371008.8 m; scale converts a
  // true chainage into the spherical distance
  const scale = getChainageScale(
    turfLine.geometry.coordinates,
    referenceLength,
  );
  const chainageLength = referenceLength || totalLength;

  const ticks = [];
  const tickStroke = new Stroke({ color: 'white', width: 2 });
  const tickFill = new Fill({ color: 'white' });

  // loop over distance along line
  for (let i = 0; i * interval <= chainageLength; i += 1) {
    const chainage = i * interval; // the label, in true metres
    const dist = chainage * scale; // the position, in turf's metres
    const pt = along(turfLine, dist, { units: 'meters' });

    // calculate bearing
    const bearingValue = bearing(
      along(turfLine, Math.max(dist - 0.1, 0), { units: 'meters' }),
      along(turfLine, Math.min(dist + 0.1, totalLength), { units: 'meters' }),
    );
    const perpBearing = bearingValue + 90; // perpendicular angle

    // create a tick line
    const tickStart = destination(pt, tickLength / 2, perpBearing, {
      units: 'meters',
    });
    const tickEnd = destination(pt, tickLength / 2, perpBearing + 180, {
      units: 'meters',
    });

    const tickFeature = new Feature({
      geometry: new LineString([
        transform(tickStart.geometry.coordinates, 'EPSG:4326', mapProjection),
        transform(tickEnd.geometry.coordinates, 'EPSG:4326', mapProjection),
      ]),
    });

    tickFeature.setStyle(
      new Style({
        stroke: tickStroke,
        text: new Text({
          text: `${chainage}`,
          fill: tickFill,
          offsetY: -20,
          offsetX: -20,
          font: '12px sans-serif', // base font
          // declutterMode: 'declutter'
        }),
      }),
    );
    ticks.push(tickFeature);
  }

  return ticks;
}
