import mapboxgl from 'mapbox-gl';
import { getData } from './data';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log("publish('NEW_SW_CONTROLLING')");
    });

    navigator.serviceWorker.register('/service-worker.js').then(
      (registration) => {
        // Registration was successful
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        // registration failed :(
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}

const spark = document.getElementById('spark');
const ctx = spark.getContext('2d');
const slider = document.getElementById('myRange');
const dateText = document.getElementById('date');
const sliderBox = document.getElementById('mySlider');
const updateNotice = document.querySelector('.update');
const mapCanvas = document.getElementById('map');

let lastName;
let lastValues;
let lastLatestValue;
let maxIdx = 3;
const radius = 5;
let height = 200;
let width = 400;
let isAreaSelected = false;

// report data properties
let theReportDate;
let theUpdateDate;
let theWeek;
let theDay;

const wk5Starts = new Date(2020, 0, 27);
const getWeekStart = (n) => {
  const weekStarts = new Date(wk5Starts);
  weekStarts.setDate(weekStarts.getDate() + (n - 5) * 7);
  return weekStarts;
};
const getWeekEnd = (n) => {
  const weekStarts = getWeekStart(n);
  weekStarts.setDate(weekStarts.getDate() + 6);
  return weekStarts;
};
const getDay = (week, day) => {
  const weekStart = getWeekStart(week);
  weekStart.setDate(weekStart.getDate() + ((day + 6) % 7));
  return weekStart;
};
const startFromEnd = (end) => {
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return start;
};
const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const getFormattedDate = (dt) => `${dt.getDate()} ${m[dt.getMonth()]}`;
const getRangeFromWeek = (week) => {
  if (week === 'thisWeek') {
    return `${getFormattedDate(startFromEnd(getDay(theWeek, theDay)))} - ${getFormattedDate(
      getDay(theWeek, theDay)
    )}`;
  } else {
    return `${getFormattedDate(getWeekStart(+week.slice(1)))} - ${getFormattedDate(
      getWeekEnd(+week.slice(1))
    )}`;
  }
};

const drawWindow = () => {
  ctx.clearRect(0, 0, spark.width, spark.height);

  // draw boundary
  ctx.strokeStyle = '#000';
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
};

let maximumCases;
const blankMessage = document.getElementById('blankCanvas');
const drawSpark = (name = lastName, values = lastValues, latestValue = lastLatestValue) => {
  if (!values) {
    drawWindow();
    blankMessage.style.display = 'block';
    return;
  }
  blankMessage.style.display = 'none';
  let dayFactor = theDay === 0 ? 7 : theDay;
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
  lastValues = values.slice(0);
  lastLatestValue = latestValue;

  drawWindow();

  // y axis
  const margin = 30;
  ctx.beginPath();
  ctx.moveTo(10 + margin, 40);
  ctx.lineTo(10 + margin, height);
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
  ctx.moveTo(margin, height);
  ctx.lineTo(10 + margin, height);
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.fillText('0', margin - 2, height + 3);

  // title
  const n = values.length;
  const u = (height - 40) / maximumCases[maxIdx];
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
  ctx.moveTo(10 + margin, height - u * first);
  values.forEach((x, i) => {
    ctx.lineTo(10 + margin + (i + 1) * ((width - margin) / n), height - u * x);

    if (tips.indexOf(i + 1) > -1) {
      // Add number over tip
      ctx.fillText(x, 10 + margin + (i + 1) * ((width - margin) / n), height - 3 - u * x);
    }
  });
  ctx.lineTo(
    10 + margin + (values.length + dayFactor / 7) * ((width - margin) / n),
    height - u * latestValue
  );

  if (tips.indexOf(values.length + 1) > -1) {
    // Add number over tip
    ctx.fillText(
      latestValue,
      10 + margin + (values.length + dayFactor / 7) * ((width - margin) / n),
      height - 3 - u * latestValue
    );
  }
  ctx.stroke();

  // draw current date line
  ctx.beginPath();
  ctx.strokeStyle = '#ff0000';
  const x =
    +slider.value === +sliderMax
      ? 10 + margin + (values.length + dayFactor / 7) * ((width - margin) / n)
      : 10 + margin + (+slider.value - 5) * ((width - margin) / n);
  ctx.moveTo(x, 40);
  ctx.lineTo(x, height);
  ctx.stroke();
};

const resizeCanvas = () => {
  spark.width = window.innerWidth;
  spark.height = window.innerHeight;
  width = Math.min(400, (3 * spark.width) / 4);
  height = Math.min(200, width / 2);
  sliderBox.style.top = `${height + 20}px`;
  sliderBox.style.width = `${width}px`;
  dateText.style.top = `${height + 10}px`;
  if (lastName) drawSpark();
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

const layers = {};

var hoveredStateId = null;
var lastHoveredStateId = -1;

const showLayerForWeek = (week = 'thisWeek') => {
  dateText.innerText = getRangeFromWeek(week);
  if (layers[week]) {
    map.setLayoutProperty(week, 'visibility', 'visible');
    map.setLayoutProperty(week + '-borders', 'visibility', 'visible');
  } else {
    layers[week] = true;
    map.addLayer({
      id: week,
      type: 'fill',
      source: 'msoa',
      layout: {
        visibility: 'visible',
      },
      paint: {
        'fill-color': [
          'case',
          ['>=', ['get', week], 20],
          'rgba(255, 45, 45, 0.55)',
          ['>=', ['get', week], 10],
          'rgba(253, 171, 44, 0.55)',
          ['>=', ['get', week], 5],
          'rgba(255, 252, 95, 0.55)',
          ['>=', ['get', week], 1],
          'rgba(189, 241, 182, 0.55)',
          ['boolean', ['feature-state', 'hover'], false],
          'rgba(98,123,193,0.55)',
          'transparent',
        ],
      },
    });
    map.addLayer({
      id: week + '-borders',
      type: 'line',
      source: 'msoa',
      layout: {
        visibility: 'visible',
      },
      minzoom: 8,
      paint: {
        'line-color': [
          'case',
          ['>=', ['get', week], 20],
          'rgb(150, 0, 0)',
          ['>=', ['get', week], 10],
          'rgb(150, 89, 0)',
          ['>=', ['get', week], 5],
          'rgb(175, 171, 0)',
          ['>=', ['get', week], 1],
          'rgb(51, 177, 34)',
          ['boolean', ['feature-state', 'hover'], false],
          '#627BC1',
          'transparent',
        ],
        'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3, 0.6],
      },
    });
    map.on('mousemove', week, function (e) {
      if (e.features.length > 0) {
        hoveredStateId = e.features[0].id;
        if (hoveredStateId !== lastHoveredStateId) {
          map.setFeatureState({ source: 'msoa', id: lastHoveredStateId }, { hover: false });
          map.setFeatureState({ source: 'msoa', id: hoveredStateId }, { hover: true });
          lastHoveredStateId = hoveredStateId;
          if (!isAreaSelected) {
            drawSpark(
              e.features[0].properties.name,
              JSON.parse(e.features[0].properties.cases),
              e.features[0].properties.thisWeek
            );
          }
        }
      }
    });
  }
  //hide all layers
  Object.keys(layers).forEach((key) => {
    if (key === week) return;
    if (map.getLayoutProperty(key, 'visibility') === 'visible')
      map.setLayoutProperty(key, 'visibility', 'none');
    if (map.getLayoutProperty(key + '-borders', 'visibility') === 'visible')
      map.setLayoutProperty(key + '-borders', 'visibility', 'none');
  });
};

const drawCases = () => {
  map.addSource('msoa', { type: 'geojson', data });
  showLayerForWeek();
};

let sliderMax;

getData().then(({ file, maxCases, reportDate, updateDate, week, day, isNewDataAvailable }) => {
  console.log(reportDate, updateDate, week, day);
  if (isNewDataAvailable) {
    updateNotice.style.display = 'block';
    updateNotice.addEventListener('click', () => {
      window.location.reload();
    });
  }
  isDataLoaded = true;
  data = file;
  sliderMax = +data.features[0].properties.maxWeek + 1;
  slider.max = sliderMax;
  slider.value = sliderMax;
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

const doSliderThing = (val) => {
  if (!sliderMax) return;
  drawSpark();
  if (+val === +sliderMax) showLayerForWeek('thisWeek');
  else showLayerForWeek('w' + val);
};

slider.addEventListener('input', (e) => {
  doSliderThing(e.target.value);
});

const downBtn = document.getElementById('downButton');
const upBtn = document.getElementById('upButton');

downBtn.addEventListener('click', () => {
  slider.value = +slider.value - 1;
  doSliderThing(slider.value);
});
upBtn.addEventListener('click', () => {
  slider.value = +slider.value + 1;
  doSliderThing(slider.value);
});
// mapCanvas.addEventListener('click', () => {
//   isAreaSelected = true;
// });

drawSpark();
