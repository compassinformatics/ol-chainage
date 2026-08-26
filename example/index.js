import './style.css';
import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4';
import { get as getProjection } from 'ol/proj.js';
import { getLength } from 'ol/sphere.js';
import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';
import TileGrid from 'ol/tilegrid/TileGrid.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { defaults as defaultControls, FullScreen } from 'ol/control.js';
import {
  defaults as defaultInteractions,
  DragRotateAndZoom,
} from 'ol/interaction.js';
import GeoJSON from 'ol/format/GeoJSON';
import { Stroke, Style } from 'ol/style';
import LineString from 'ol/geom/LineString.js';
import {
  addChainageMarkers,
  LineSliceHighlight,
  convertCoords,
} from '@compassinformatics/ol-chainage';

// setup ITM projection
proj4.defs(
  'EPSG:2157',
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=0.99982 +x_0=600000 +y_0=750000 ' +
    '+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
);

register(proj4);

let map, lineGeom, geom4326, referenceLength;
const highlighter = new LineSliceHighlight();

// customise the highlight style if required
highlighter.setStyle(
  new Style({
    stroke: new Stroke({
      color: 'deeppink',
      width: 4,
    }),
  }),
);

// function to update the highlight based on input values
function updateHighlight() {
  const start = parseFloat(document.getElementById('start-measure').value);
  const end = parseFloat(document.getElementById('end-measure').value);

  if (!lineGeom || isNaN(start) || isNaN(end) || end <= start) {
    highlighter.removeHighlight();
    return;
  }

  const useOpenLayers = false;

  // both paths now take EPSG:4326 and correct against the ITM length
  highlighter.highlightSlice(
    geom4326,
    start,
    end,
    map,
    useOpenLayers,
    referenceLength,
  );
}

// attach event listeners to input boxes
function setupEventHandlers() {
  const startInput = document.getElementById('start-measure');
  const endInput = document.getElementById('end-measure');

  startInput.addEventListener('input', updateHighlight);
  endInput.addEventListener('input', updateHighlight);
}

function main() {
  setupEventHandlers();
  const projection = getProjection('EPSG:2157');

  const aerialTiles = new TileLayer({
    source: new XYZ({
      url: 'https://utility.arcgis.com/usrsvcs/servers/c16c7a02066443e498956af55a3a0d1c/rest/services/MapGenieDigitalGlobeImagery2011to2013ITM/MapServer/tile/{z}/{y}/{x}',
      projection: 'EPSG:2157',
      attributions: '&copy; Tailte Éireann',
      extent: [421849.81, 515251.59, 785108.1, 968015.39],
      tileGrid: new TileGrid({
        origin: [-5022200.0, 4821100.0],
        resolutions: [
          1058.3354500042335, 661.4596562526459, 330.72982812632296,
          158.75031750063502, 105.83354500042334, 52.91677250021167,
          26.458386250105836, 13.229193125052918, 6.614596562526459,
          2.6458386250105836, 1.3229193125052918, 0.6614596562526459,
          0.26458386250105836,
        ],
      }),
    }),
  });

  map = new Map({
    target: 'map',
    controls: defaultControls().extend([new FullScreen()]),
    interactions: defaultInteractions().extend([new DragRotateAndZoom()]),
    layers: [aerialTiles],
    view: new View({
      projection: projection,
      center: [714262.18, 728918.11],
      zoom: 18,
    }),
  });

  // create a new layer
  const exampleSource = new VectorSource();
  const exampleLayer = new VectorLayer({
    source: exampleSource,
    style: new Style({
      stroke: new Stroke({
        color: 'yellow',
        width: 3,
      }),
    }),
  });

  fetch('./sample.json')
    .then((response) => response.json())
    .then((geojsonData) => {
      const features = new GeoJSON().readFeatures(geojsonData, {
        dataProjection: 'EPSG:2157', // projection of the GeoJSON file
      });
      exampleSource.addFeatures(features);
      map.addLayer(exampleLayer);

      // gather all coordinates to a single line
      const allCoords2157 = [];

      features.forEach((feature) => {
        const geom = feature.getGeometry().clone();

        const coords = geom.getCoordinates();
        if (feature.get('withDirection') === false) {
          coords.reverse();
        }
        coords.forEach((coord) => {
          allCoords2157.push(coord);
        });
      });

      lineGeom = new LineString(allCoords2157);
      const allCoords4326 = convertCoords(
        lineGeom.getCoordinates(),
        map.getView().getProjection(),
        'EPSG:4326',
      );

      geom4326 = new LineString(allCoords4326);
      // ITM planar length
      referenceLength = lineGeom.getLength();

      const ticks = addChainageMarkers(
        allCoords4326,
        map.getView().getProjection(),
        referenceLength,
      );

      if (ticks) {
        const chainageSource = new VectorSource();
        chainageSource.addFeatures(ticks);
        const chainageLayer = new VectorLayer({
          source: chainageSource,
          minZoom: 18,
        });
        map.addLayer(chainageLayer);
      }

      const extent = exampleSource.getExtent();
      if (!isNaN(extent[0])) {
        // check for a valid extent
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 18,
          duration: 500,
        });
      }
      updateHighlight();

      const spherical = getLength(geom4326, { projection: 'EPSG:4326' });
      console.log(
        'ITM length:',
        referenceLength.toFixed(1),
        'spherical:',
        spherical.toFixed(1),
        'scale:',
        (spherical / referenceLength).toFixed(6),
      );
    })
    .catch((err) => console.error('Error loading GeoJSON:', err));
}

main();
