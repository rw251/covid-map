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
    fetch('https://api.jsonbin.io/b/5f2cfe856f8e4e3faf2d207c').then((resp) => resp.json()),
    fetch('https://api.jsonbin.io/b/5f2cfea56f8e4e3faf2d2086').then((resp) => resp.json()),
  ]).then(([a, b]) => ({ ...a, ...b }));

const getData = () =>
  Promise.all([getMsoaBoundaries(), getCasesData()]).then(([file, cases]) => {
    let maxCases = [0];
    file.features.forEach((feat) => {
      feat.id = feat.properties.OBJECTID;
      if (cases[feat.properties.MSOA11CD]) {
        feat.properties.cases = cases[feat.properties.MSOA11CD].d;
        feat.properties.name = cases[feat.properties.MSOA11CD].n;
        feat.properties.thisWeek = feat.properties.cases[feat.properties.cases.length - 1];
        const thisMax = feat.properties.cases.reduce((max, next) => Math.max(max, next), 0);
        if (thisMax > maxCases[0]) {
          maxCases.unshift(thisMax);
        }
      } else {
        feat.properties.cases = [{}, {}, {}];
        feat.properties.thisWeek = 0;
        feat.properties.name = 'No data for this area';
      }
    });
    return { file, maxCases };
  });

export { getData };
