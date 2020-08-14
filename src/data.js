const getMsoaBoundaries = () =>
  Promise.all([
    fetch('msoa1.json').then((resp) => resp.json()),
    fetch('msoa2.json').then((resp) => resp.json()),
    fetch('msoa3.json').then((resp) => resp.json()),
    fetch('msoa4.json').then((resp) => resp.json()),
  ]).then(([a, b, c, d]) => {
    a.features = a.features.concat(b.features);
    a.features = a.features.concat(c.features);
    a.features = a.features.concat(d.features);
    return a;
  });

const getCasesData = () => fetch('data.min.json').then((resp) => resp.json());

const getData = () =>
  Promise.all([getMsoaBoundaries(), getCasesData()]).then(([file, cases]) => {
    let maxCases = [0];
    const { reportDate, updateDate, week, day } = cases;
    file.features.forEach((feat) => {
      feat.id = feat.properties.OBJECTID;
      if (cases[feat.properties.MSOA11CD]) {
        for (let i = 0; i < cases[feat.properties.MSOA11CD].d.length; i++) {
          feat.properties['w' + (i + 5)] = cases[feat.properties.MSOA11CD].d[i];
        }
        feat.properties.maxWeek = cases[feat.properties.MSOA11CD].d.length + 4;
        feat.properties.cases = cases[feat.properties.MSOA11CD].d;
        feat.properties.name = cases[feat.properties.MSOA11CD].n;
        feat.properties.thisWeek = cases[feat.properties.MSOA11CD].l;
        const thisMax = feat.properties.cases.reduce((max, next) => Math.max(max, next), 0);
        if (thisMax > maxCases[0]) {
          maxCases.unshift(thisMax);
        }
      } else {
        feat.properties.cases = [{}, {}, {}];
        for (let i = 0; i < 100; i++) {
          feat.properties['w' + i] = 0;
        }
        feat.properties.thisWeek = 0;
        feat.properties.name = 'No data for this area';
      }
    });
    return { file, maxCases, reportDate, updateDate, week, day };
  });

export { getData };
