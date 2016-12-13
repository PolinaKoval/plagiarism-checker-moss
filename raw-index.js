'use strict';
const request = require('request-promise');
const fs = require('fs');
const path =require('path');
const fse = require('fs-extra');
const url = require('url');
const urljoin = require('url-join');
const config = require('./config.json');
const OAUTH_TOKEN = fs.readFileSync('./key.txt', 'utf-8').trim();
const assignmentDir = path.join(__dirname, 'assigments');

const getOptions = (address) => ({
    uri: address,
    headers: config.headers,
    transform: JSON.parse
});

const main = async () => {
    try {
        await createWorkDir();
        const allPullRequests2016 = (await getPullRequests(config.repName, config.taskName));
        //const allPullRequests2015 = (await getPullRequests(config.repName1, config.taskName1));
        const promises = allPullRequests2016.map(pr => getAndSaveAssignment(pr, config.repName, config.taskName))
            //.concat(allPullRequests2015.map(pr => getAndSaveAssignment(pr, config.repName1, config.taskName1)));
        await Promise.all(promises);
        const checkReport = await runChecker();
        console.log(checkReport);
    } catch (e) {
        console.log(e);
    }
};

const createWorkDir = () => {
    return new Promise((resolve, reject) => {
        fse.emptyDir(assignmentDir, err => {
            if (!err) {
                return resolve();
            }
            reject(err);
        });
    });
};

const runChecker = () => {
    const exec = require('child_process').exec;
    const assignments = fs.readdirSync(assignmentDir)
        .map(assignment => path.join(assignmentDir, assignment))
        .join(' ');

    return new Promise((resolve, reject) => {
        exec(`perl moss.pl -l javascript ${assignments}`, (error, stdout) => {
          if (error) {
            reject(`exec error: ${error}`);
            return;
          }
          const report = stdout.split(/\r|\n/).find(str => str.indexOf("moss.stanford.edu") > 0);
          resolve(report)
        });
    });
};

const getPullRequests = (repName, taskName) => {
    const address = url.format({
        protocol: config.protocol,
        host: config.host,
        pathname: urljoin('repos', repName, taskName, 'pulls'),
        query: {
            [config.oauthQuery]: OAUTH_TOKEN,
            state: config.state,
            per_page: 100
        }
    });

    const options = getOptions(address);
    return request(options);
};

const getListPRFiles = (pr, repName, taskName) => {
    const address = url.format({
        protocol: config.protocol,
        host: config.host,
        pathname: urljoin('repos', repName, taskName, 'pulls', pr.number, 'files'),
        query: {
            [config.oauthQuery]: OAUTH_TOKEN
        }
    });
    const options = getOptions(address);
    return request(options)
};

const getFile = (file) => {
    const options = {
        uri: file.raw_url,
        headers: config.headers
    };
    return request(options);
};

const getAndSaveAssignment = async (pr, repName, taskName) => {
    const files = await getListPRFiles(pr, repName, taskName);
    const fileToCheck = files.find(file => file.filename === config.fileName);
    if (!fileToCheck) {
        return;
    }
    const file = await getFile(fileToCheck);
    const fullFileName = path.join(assignmentDir, pr.user.login) + ".js";
    return fs.writeFile(fullFileName, file);
};

main();
