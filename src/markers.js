import { lineString } from '@turf/helpers';
import destination from '@turf/destination';
import along from '@turf/along';
import { bearing } from '@turf/bearing';
import length from '@turf/length';
import { cleanCoords } from '@turf/clean-coords';
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import Fill from 'ol/style/Fill.js';
import Text from 'ol/style/Text.js';
import { transform } from 'ol/proj.js';
import { Stroke, Style } from 'ol/style';

export function addChainageMarkers(lineCoords, mapProjection) {
  // convert ol geometry to Turf LineString
  const turfLine = cleanCoords(lineString(lineCoords));
  const interval = 10; // metres
  const totalLength = length(turfLine, { units: 'meters' });
  const ticks = [];

  // loop over distance along line
  for (let dist = 0; dist <= totalLength; dist += interval) {
    const pt = along(turfLine, dist, { units: 'meters' });

    // calculate bearing
    const bearingValue = bearing(
      along(turfLine, Math.max(dist - 0.1, 0), { units: 'meters' }),
      along(turfLine, Math.min(dist + 0.1, totalLength), { units: 'meters' }),
    );
    const perpBearing = bearingValue + 90; // perpendicular angle

    // create a tick line
    const tickLength = 5; // in meters
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
        stroke: new Stroke({ color: 'white', width: 2 }),
        text: new Text({
          text: `${Math.round(dist)}`,
          fill: new Fill({ color: 'white' }),
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
