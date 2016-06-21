'use strict';

const fs = require('fs');
const hbs = require('handlebars');

let template = fs.readFileSync('./htmlReport/template.txt').toString();

exports.generateTable = data => {
    let html = hbs.compile(template);
    fs.writeFile(`${data.task}.html`, html(data));
};
