const fetch = require('node-fetch');
const fs = require('fs');
const { join } = require('path');
const XlsxStreamReader = require('xlsx-stream-reader');

const dataA = JSON.parse(fs.readFileSync(join(__dirname, '..', 'data', 'dataA.json')));
const dataB = JSON.parse(fs.readFileSync(join(__dirname, '..', 'data', 'dataB.json')));

const lastReportDate = dataA.reportDate;
const lastUpdateDate = dataA.updateDate;

const getInfoFromXls = () =>
  fetch('https://coronavirus.data.gov.uk/downloads/msoa_data/MSOAs_latest.xlsx').then(
    (res) =>
      new Promise((resolve) => {
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
                if (rowVal.indexOf('Published:') === 0) {
                  reportDate = rowVal.replace('Published: ', '').trim();
                  console.log('Report date: ' + reportDate);
                }
                if (rowVal.indexOf('report (up to') > -1) {
                  const [, wk, dy, updateDt] = rowVal.match(
                    /week ([0-9]+) day ([0-9]+) data.*ending (.+)\)/
                  );
                  week = +wk;
                  day = +dy;
                  updateDate = updateDt;
                }
              });
            }
          });

          // call process after registering handlers
          workSheetReader.process();
        });
        workBookReader.on('end', function () {
          // end of workbook reached
          return resolve({ week, day, reportDate, updateDate });
        });

        res.body.pipe(workBookReader);
      })
  );

const getLatestData = ({ week, day, reportDate, updateDate }) =>
  fetch('https://c19downloads.azureedge.net/downloads/msoa_data/MSOAs_latest.json')
    .then((x) => x.text())
    // sometimes they use NaN instead of null
    .then((x) => JSON.parse(x.replace(/NaN/g, 'null')))
    .then((x) => {
      console.log('New data so updating...');
      x.data.forEach((datum) => {
        let item = dataA[datum.msoa11_cd];
        if (dataB[datum.msoa11_cd]) item = dataB[datum.msoa11_cd];
        if (!item) return;
        item.l = datum.latest_7_days || 0;
        item.d = datum.msoa_data.map((x) => x.value || 0);
      });
      dataA.reportDate = reportDate;
      dataA.updateDate = updateDate;
      dataA.week = week;
      dataA.day = day;
      fs.writeFileSync(join(__dirname, '..', 'data', 'dataA.json'), JSON.stringify(dataA));
      fs.writeFileSync(join(__dirname, '..', 'data', 'dataB.json'), JSON.stringify(dataB));
    });

// getLatestData();
getInfoFromXls().then(({ week, day, reportDate, updateDate }) =>
  reportDate !== lastReportDate || updateDate !== lastUpdateDate
    ? getLatestData({ week, day, reportDate, updateDate })
    : Promise.resolve().then(() => console.log('No new data so nothing doing..'))
);
