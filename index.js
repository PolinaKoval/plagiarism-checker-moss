'use strict';
const rp = require('request-promise');
const fs = require('fs');
const url = require('url');
const urljoin = require('url-join');
const config = require('./config.json');
const fileToCheck = config.file;
const OAUTH_TOKEN = fs.readFileSync('./key.txt', 'utf-8');
const checker = require('./checker.js');
const reportGenerator = require('./htmlReport/reportGenerator');

let dataTocheck = {};

let address = url.format({
    protocol: config.protocol,
    host: config.host,
    pathname: urljoin('repos', config.repName, config.taskName, 'pulls'),
    query: {
        [config.oauthQuery]: OAUTH_TOKEN,
        state: config.state,
        per_page: 100
    }
});

let options = {
    uri: address,
    headers: config.headers,
    transform: JSON.parse
};

rp(options)
.then(data => {
    let promises = [];
    data.forEach(pr => {
        let login = pr.user.login;
        let fullName = pr.title;
        let pullUrl = pr.html_url;
        dataTocheck[login] = {
            url: pullUrl,
            fullName
        };
        let promise = filesPromise(pr);
        promises.push(promise);
    });
    Promise.all(promises)
        .then(compare)
        .then(reportGenerator.generateTable)
        .catch(console.error);
})
.catch(console.error);


function compare() {
    let data = [];
    for (let name1 in dataTocheck) {
        let newData = {
            user: name1,
            fullName: dataTocheck[name1].fullName,
            url: dataTocheck[name1].url,
            results: []
        };
        let file1 = dataTocheck[name1].file;
        for (let name2 in dataTocheck) {
            let result = {};
            if (name1 !== name2) {
                let file2 = dataTocheck[name2].file;
                result.percent = checker.check(file1, file2);
                result.percent > 60 ? result.status = 'dangerous' : result.status = 'normal';
                newData.results.push(result);
            } else {
                newData.results.push({self: true});
            }
        }
        data.push(newData);
    }

    return {
        task: config.taskName,
        data
    };
}

function filesPromise(pr) {
    let address = url.format({
        protocol: config.protocol,
        host: config.host,
        pathname: urljoin('repos', config.repName, config.taskName, 'pulls', pr.number, 'files'),
        query: {
            [config.oauthQuery]: OAUTH_TOKEN
        }
    });
    let options = {
        uri: address,
        headers: config.headers,
        transform: JSON.parse
    };
    let login = pr.user.login;
    return new Promise((resolve, reject) => {
        rp(options)
        .then(files => {
            let file = files.find(file => file.filename === fileToCheck);
            if (file) {
                filePromise(login, file)
                .then(resolve)
                .catch(reject);
            } else {
                delete dataTocheck[login];
                resolve();
            }
        })
        .catch(reject);
    });
}

function filePromise(login, file) {
    let options = {
        uri: file.raw_url,
        headers: config.headers
    };
    let filename = file.filename;
    return rp(options)
    .then(text => {
        //console.log(login);
        dataTocheck[login].file = {
            filename,
            text
        };
    })
    .catch(console.error);
}
