import mapboxgl from 'mapbox-gl';

const getMsoaBoundaries = () =>
  Promise.all([
    fetch('https://api.jsonbin.io/b/5f29cc846f8e4e3faf2b25ad').then((resp) => resp.json()),
    fetch('https://api.jsonbin.io/b/5f29ccabdddf413f95bcd7e3/1').then((resp) => resp.json()),
    fetch('https://api.jsonbin.io/b/5f29cda26f8e4e3faf2b268a').then((resp) => resp.json()),
    fetch('https://api.jsonbin.io/b/5f29cdebdddf413f95bcd8f2').then((resp) => resp.json()),
  ]).then(([a, b, c, d]) => {
    a.features = a.features.concat(b.features);
    a.features = a.features.concat(c.features);
    a.features = a.features.concat(d.features);
    return a;
  });

const getCasesData = () =>
  Promise.all([
    fetch('https://api.jsonbin.io/b/5f29d48ddddf413f95bcde9d').then((resp) => resp.json()),
    fetch('https://api.jsonbin.io/b/5f29d4ad6f8e4e3faf2b2c9d').then((resp) => resp.json()),
  ]).then(([a, b]) => ({ ...a, ...b }));

const spark = document.getElementById('spark');
const ctx = spark.getContext('2d');

let lastName;
let lastValues;
let maxCases = [0];
let maxIdx = 3;
const radius = 5;
let height = 200;
let width = 400;

const drawSpark = (name, values) => {
  if (!values) return;
  const tips = [];
  values.forEach((val, i) => {
    if (
      (i === 0 || (i > 0 && val.value > (values[i - 1].value || 0))) &&
      (i === values.length - 1 || val.value > (values[i + 1].value || 0))
    ) {
      tips.push(i);
    }
  });
  lastName = name;
  lastValues = values;
  ctx.clearRect(0, 0, spark.width, spark.height);

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
  ctx.fillText(maxCases[maxIdx], margin - 2, 43);
  ctx.beginPath();
  ctx.moveTo(margin, 200);
  ctx.lineTo(10 + margin, 200);
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.fillText('0', margin - 2, 203);

  const n = values.length;
  const u = 160 / maxCases[maxIdx];
  const first = values.shift().value || 0;
  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'left';
  ctx.fillText(name, 20, 30);
  ctx.stroke();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.beginPath();
  ctx.moveTo(10 + margin, 200 - u * first);
  values.forEach((x, i) => {
    ctx.lineTo(10 + margin + (i + 1) * ((width - margin) / n), 200 - u * (x.value || 0));

    if (tips.indexOf(i + 1) > -1) {
      // Add number over tip
      ctx.fillText(x.value, 10 + margin + (i + 1) * ((width - margin) / n), 197 - u * x.value);
    }
  });
  ctx.stroke();
};

const resizeCanvas = () => {
  spark.width = window.innerWidth;
  spark.height = window.innerHeight;
  width = Math.min(400, spark.width / 2);
  if (lastName) drawSpark(lastName, lastValues);
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

Promise.all([getMsoaBoundaries(), getCasesData()]).then(([file, cases]) => {
  file.features.forEach((feat) => {
    feat.id = feat.properties.OBJECTID;
    if (cases[feat.properties.MSOA11CD]) {
      feat.properties.cases = cases[feat.properties.MSOA11CD].d;
      feat.properties.name = cases[feat.properties.MSOA11CD].n;
      feat.properties.thisWeek = feat.properties.cases[feat.properties.cases.length - 1].value || 0;
      const thisMax = feat.properties.cases.reduce(
        (max, next) => Math.max(max, next.value || 0),
        0
      );
      if (thisMax > maxCases[0]) {
        console.log(feat.properties.name, thisMax);
        maxCases.unshift(thisMax);
      }

      if (feat.properties.cases.length !== 26) console.log(feat.id, feat.cases);
    } else {
      feat.properties.cases = [{}, {}, {}];
      feat.properties.thisWeek = 0;
      feat.properties.name = 'No data for this area';
    }
  });
  map.on('load', function () {
    map.addSource('msoa', { type: 'geojson', data: file });
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
  });
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
    console.log(hoveredStateId);
    if (hoveredStateId !== lastHoveredStateId) {
      map.setFeatureState({ source: 'msoa', id: lastHoveredStateId }, { hover: false });
      map.setFeatureState({ source: 'msoa', id: hoveredStateId }, { hover: true });
      lastHoveredStateId = hoveredStateId;
      drawSpark(e.features[0].properties.name, JSON.parse(e.features[0].properties.cases));
    }
  }
});
