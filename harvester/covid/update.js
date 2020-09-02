const fetch = require('node-fetch');
const fs = require('fs');
const { join } = require('path');
const XlsxStreamReader = require('xlsx-stream-reader');

const dataFile = join(__dirname, 'data.json');
const dateFile = join(__dirname, '..', '..', 'public_html', 'covid', 'latest.json');
const data = JSON.parse(fs.readFileSync(dataFile));

const lastReportDate = data.reportDate;
const lastUpdateDate = data.updateDate;

const getInfoFromXls = () =>
  fetch('https://coronavirus.data.gov.uk/downloads/msoa_data/MSOAs_latest.xlsx').then(
    (res) =>
      new Promise((resolve, reject) => {
        const workBookReader = new XlsxStreamReader();

        let updateDate;
        let reportDate;
        let week;
        let day;

        workBookReader.on('worksheet', function (workSheetReader) {
          if (workSheetReader.id > 1) {
            // we only want first sheet
            workSheetReader.skip();
            return;
          }
          // print worksheet name
          console.log('First sheet should be: Contents');
          console.log('First sheet is actually: ' + workSheetReader.name);

          // if we do not listen for rows we will only get end event
          // and have infor about the sheet like row count
          workSheetReader.on('row', function (row) {
            if (row.attributes.r == 1) {
              // do something with row 1 like save as column names
            } else {
              // second param to forEach colNum is very important as
              // null columns are not defined in the array, ie sparse array
              row.values.forEach(function (rowVal) {
                if (typeof rowVal === 'string' && rowVal.indexOf('Published:') === 0) {
                  reportDate = rowVal.replace('Published: ', '').trim();
                  console.log('Report date: ' + reportDate);
                }
                if (typeof rowVal === 'string' && rowVal.indexOf('report (up to') > -1) {
                  if (rowVal.indexOf('day') > -1) {
                    // Says something like: Week 33 report (up to week 34 day 3 data - ending 16th August 2020)
                    const [, wk, dy, updateDt] = rowVal.match(
                      /week ([0-9]+) day ([0-9]+) data.*ending (.+)\)/
                    );
                    week = +wk;
                    day = +dy;
                    updateDate = updateDt;
                  } else {
                    // Says something like: Week 34 report (up to week 33 data - ending 16th August 2020)
                    const [, wk, updateDt] = rowVal.match(/week ([0-9]+) data.*ending (.+)\)/);
                    week = +wk;
                    day = 0;
                    updateDate = updateDt;
                  }
                }
              });
            }
          });

          // call process after registering handlers
          workSheetReader.process();
        });
        workBookReader.on('error', function (err) {
          console.log('An error occurred reading the xlsx file. Maybe try later.');
          console.log(err);
          return reject(err);
        });
        workBookReader.on('end', function () {
          // end of workbook reached
          return resolve({ week, day, reportDate, updateDate });
        });

        res.body.pipe(workBookReader);
      })
  );

const arcUrl = 'https://www.arcgis.com/sharing/rest/content/items/';
const getInfoFromArcGis = () =>
  Promise.all([
    fetch(`${arcUrl}47574f7a6e454dc6a42c5f6912ed7076/data?f=json`).then((resp) => resp.json()),
    fetch(`${arcUrl}3ba363a4dad94c2fb1748654048d9506/data?f=json`).then((resp) => resp.json()),
  ]).then(([obj1, obj2]) => {
    // id is like "MSOA_2011_week_35_day_5_8314"
    const id = obj2.operationalLayers.filter((x) => x.id.indexOf('MSOA_2011_week') > -1)[0].id;
    const [, , , week, , day] = id.split('_');

    // title is like "22nd August to 28th August"
    const [, reportDate] = obj1.title.split(' to ');
    const updateDate = new Date().toISOString().substr(0, 10);

    return { week: +week, day: +day, reportDate, updateDate };
  });

const getLatestData = ({ week, day, reportDate, updateDate }) =>
  fetch('https://c19downloads.azureedge.net/downloads/msoa_data/MSOAs_latest.json')
    .then((x) => x.text())
    // sometimes they use NaN instead of null
    .then((x) => JSON.parse(x.replace(/NaN/g, 'null')))
    .then((x) => {
      console.log('New data so updating...');
      const isWeekEnd = x.data.filter((x) => x.last_7_days || x.latest_7_days).length === 0;
      x.data.forEach((datum) => {
        if (!data[datum.msoa11_cd]) return;
        const latest = datum.last_7_days || datum.latest_7_days;
        if (!latest) {
          if (!isWeekEnd) {
            //ei!ther 0 because it's null
            data[datum.msoa11_cd].l = 0;
          } else {
            // or it's the end of a week
            data[datum.msoa11_cd].l = datum.msoa_data.pop().value || 0;
          }
        } else {
          data[datum.msoa11_cd].l = latest < 0 ? 0 : latest;
        }
        data[datum.msoa11_cd].d = datum.msoa_data
          .map((x) => x.value || 0)
          .map((x) => (x < 0 ? 0 : x));
      });
      data.reportDate = reportDate;
      data.updateDate = updateDate;
      data.week = week;
      data.day = day;
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2).replace(/ {2}/g, '\t'));
      fs.writeFileSync(dateFile, JSON.stringify({ reportDate, updateDate }));
    });

// let week = 32;
// let day = 0;
// let reportDate = '13 August 2020';
// let updateDate = '9th August 2020';

getInfoFromArcGis().then(({ week, day, reportDate, updateDate }) => {
  console.log(week, day, reportDate, updateDate);
});
Promise.all([getInfoFromArcGis(), getInfoFromXls()])
  .then(([info1, info2]) => {
    const dayFromArc = info1.week * 7 + info1.day;
    const dayFromXls = info2.week * 7 + info2.day;
    // TODO this will break on 1 Jan 2021
    if (dayFromArc > dayFromXls) return info1;
    return info2;
  })
  .then(({ week, day, reportDate, updateDate }) =>
    reportDate !== lastReportDate || updateDate !== lastUpdateDate
      ? getLatestData({ week, day, reportDate, updateDate })
      : Promise.resolve().then(() => console.log('No new data so nothing doing..'))
  )
  .catch(() => console.log('Exited after error.'));
