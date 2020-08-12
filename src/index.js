import mapboxgl from 'mapbox-gl';
import { getData } from './data';

const spark = document.getElementById('spark');
const ctx = spark.getContext('2d');

let lastName;
let lastValues;
let lastLatestValue;
let maxIdx = 3;
const radius = 5;
let height = 200;
let width = 400;

// report data properties
let theReportDate;
let theUpdateDate;
let theWeek;
let theDay;

let maximumCases;
const drawSpark = (name, values, latestValue) => {
  if (!values) return;
  const tips = [];
  const allValues = values.concat([latestValue]);
  allValues.forEach((val, i) => {
    if (
      (i === 0 || (i > 0 && val > allValues[i - 1])) &&
      (i === allValues.length - 1 || val > allValues[i + 1])
    ) {
      tips.push(i);
    }
  });
  lastName = name;
  lastValues = values;
  lastLatestValue = latestValue;
  ctx.clearRect(0, 0, spark.width, spark.height);

  // draw boundary
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(10 + radius, 10);
  ctx.lineTo(10 + width - radius, 10);
  ctx.quadraticCurveTo(10 + width, 10, 10 + width, 10 + radius);
  ctx.lineTo(10 + width, 10 + height - radius);
  ctx.quadraticCurveTo(10 + width, 10 + height, 10 + width - radius, 10 + height);
  ctx.lineTo(10 + radius, 10 + height);
  ctx.quadraticCurveTo(10, 10 + height, 10, 10 + height - radius.bl);
  ctx.lineTo(10, 10 + radius);
  ctx.quadraticCurveTo(10, 10, 10 + radius, 10);
  ctx.closePath();
  ctx.fill();

  // y axis
  const margin = 30;
  ctx.beginPath();
  ctx.moveTo(10 + margin, 40);
  ctx.lineTo(10 + margin, 200);
  ctx.stroke();

  // y axis markers
  ctx.beginPath();
  ctx.moveTo(margin, 40);
  ctx.lineTo(10 + margin, 40);
  ctx.stroke();
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'right';
  ctx.fillText(maximumCases[maxIdx], margin - 2, 43);
  ctx.beginPath();
  ctx.moveTo(margin, 200);
  ctx.lineTo(10 + margin, 200);
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.fillText('0', margin - 2, 203);

  // title
  const n = values.length;
  const u = 160 / maximumCases[maxIdx];
  const first = values.shift();
  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'left';
  ctx.fillText(name, 20, 30);
  ctx.stroke();

  // x bits
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.beginPath();
  ctx.moveTo(10 + margin, 200 - u * first);
  values.forEach((x, i) => {
    ctx.lineTo(10 + margin + (i + 1) * ((width - margin) / n), 200 - u * x);

    if (tips.indexOf(i + 1) > -1) {
      // Add number over tip
      ctx.fillText(x, 10 + margin + (i + 1) * ((width - margin) / n), 197 - u * x);
    }
  });
  ctx.lineTo(
    10 + margin + (values.length + theDay / 7) * ((width - margin) / n),
    200 - u * latestValue
  );

  if (tips.indexOf(values.length + 1) > -1) {
    // Add number over tip
    ctx.fillText(
      latestValue,
      10 + margin + (values.length + theDay / 7) * ((width - margin) / n),
      197 - u * latestValue
    );
  }
  ctx.stroke();
};

const resizeCanvas = () => {
  spark.width = window.innerWidth;
  spark.height = window.innerHeight;
  width = Math.min(400, spark.width / 2);
  if (lastName) drawSpark(lastName, lastValues, lastLatestValue);
};

window.addEventListener('resize', resizeCanvas, false);

resizeCanvas();

mapboxgl.accessToken =
  'pk.eyJ1IjoiMTIzNHJpY2hhcmR3aWxsaWFtcyIsImEiOiJja2Q3ZW1majkwMjFhMnRxcmhseDVpdWphIn0.-7Q7C7_uLQJgJqmPkgy-qw';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10?optimize=true',
  center: [-2.6416415135265, 53.592328230096889],
  zoom: 8,
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

let isDataLoaded = false;
let isMapLoaded = false;
let data;

const drawCases = () => {
  map.addSource('msoa', { type: 'geojson', data });
  map.addLayer({
    id: 'msoa',
    type: 'fill',
    source: 'msoa',
    layout: {},
    paint: {
      'fill-color': [
        'case',
        ['>=', ['get', 'thisWeek'], 20],
        'rgba(255, 45, 45, 0.55)',
        ['>=', ['get', 'thisWeek'], 10],
        'rgba(253, 171, 44, 0.55)',
        ['>=', ['get', 'thisWeek'], 5],
        'rgba(255, 252, 95, 0.55)',
        ['>=', ['get', 'thisWeek'], 1],
        'rgba(189, 241, 182, 0.55)',
        ['boolean', ['feature-state', 'hover'], false],
        'rgba(98,123,193,0.55)',
        'transparent',
      ],
    },
  });
  map.addLayer({
    id: 'msoa-borders',
    type: 'line',
    source: 'msoa',
    layout: {},
    paint: {
      'line-color': [
        'case',
        ['>=', ['get', 'thisWeek'], 20],
        'rgb(150, 0, 0)',
        ['>=', ['get', 'thisWeek'], 10],
        'rgb(150, 89, 0)',
        ['>=', ['get', 'thisWeek'], 5],
        'rgb(175, 171, 0)',
        ['>=', ['get', 'thisWeek'], 1],
        'rgb(51, 177, 34)',
        ['boolean', ['feature-state', 'hover'], false],
        '#627BC1',
        'transparent',
      ],
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3, 0.6],
    },
  });
};

getData().then(({ file, maxCases, reportDate, updateDate, week, day }) => {
  console.log(reportDate, updateDate, week, day);
  isDataLoaded = true;
  data = file;
  maximumCases = maxCases;
  theReportDate = reportDate;
  theUpdateDate = updateDate;
  theWeek = week;
  theDay = day;
  if (isMapLoaded) drawCases();
});

map.on('load', () => {
  isMapLoaded = true;
  if (isDataLoaded) drawCases();
});

map.on('mousemove', function (e) {
  var features = map.queryRenderedFeatures(e.point);
  if (features.length > 0 && features[0].properties.OBJECTID) {
    spark.style.display = 'block';
  } else {
    spark.style.display = 'none';
  }
});

var hoveredStateId = null;
var lastHoveredStateId = -1;
map.on('mousemove', 'msoa', function (e) {
  if (e.features.length > 0) {
    hoveredStateId = e.features[0].id;
    if (hoveredStateId !== lastHoveredStateId) {
      map.setFeatureState({ source: 'msoa', id: lastHoveredStateId }, { hover: false });
      map.setFeatureState({ source: 'msoa', id: hoveredStateId }, { hover: true });
      lastHoveredStateId = hoveredStateId;
      drawSpark(
        e.features[0].properties.name,
        JSON.parse(e.features[0].properties.cases),
        e.features[0].properties.thisWeek
      );
    }
  }
});
