const fetch = require('node-fetch');
const fs = require('fs');
const { join } = require('path');

const dataA = JSON.parse(fs.readFileSync(join(__dirname, '..', 'data', 'dataA.json')));
const dataB = JSON.parse(fs.readFileSync(join(__dirname, '..', 'data', 'dataB.json')));

const numWeeks = dataA[Object.keys(dataA)[0]].d.length;

const getLatestData = () =>
  fetch('https://c19downloads.azureedge.net/downloads/msoa_data/MSOAs_latest.json')
    .then((x) => x.json())
    .then((x) => {
      const newWeeks = x.data[0].msoa_data.length;
      if (newWeeks !== numWeeks) {
        console.log('New data so updating...');
        x.data.forEach((datum) => {
          let item = dataA[datum.msoa11_cd];
          if (dataB[datum.msoa11_cd]) item = dataB[datum.msoa11_cd];
          if (!item) return;
          for (let i = item.d.length; i < datum.msoa_data.length; i++) {
            const newVal = datum.msoa_data[i].value || 0;
            item.d.push(newVal);
          }
        });
        fs.writeFileSync(join(__dirname, '..', 'data', 'dataA.json'), JSON.stringify(dataA));
        fs.writeFileSync(join(__dirname, '..', 'data', 'dataB.json'), JSON.stringify(dataB));
      } else {
        console.log('No new data so nothing doing..');
      }
    });

getLatestData();
