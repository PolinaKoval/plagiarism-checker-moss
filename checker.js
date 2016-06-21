'use strict';
let acorn = require('acorn');
let estraverse = require('estraverse');
let fs = require('fs');
let meaningfulStat = [
    'ReturnStatement',
    'BreakStatement',
    'ContinueStatement',
    'IfStatement',
    'SwitchStatement',
    'ThrowStatement',
    'TryStatement',
    'WhileStatement',
    'DoWhileStatement',
    'ForStatement',
    'ForInStatement',
    'VariableDeclarator',
    'start',
    'end'
];

exports.check = (obj1, obj2) => {
    let ast1 = acorn.parse(obj1.text);
    let ast2 = acorn.parse(obj2.text);

    ast1 = processAST(ast1);
    ast2 = processAST(ast2);

    let data1 = extractData(ast1);
    let data2 = extractData(ast2);

    let blocks1 = data1.blocks.filter(block => block.length > 1);
    let blocks2 = data2.blocks.filter(block => block.length > 1);

    blocks1 = getUniqueBlocks(blocks1);
    blocks2 = getUniqueBlocks(blocks2);

    let varNames1 = data1.varNames;
    let varNames2 = data2.varNames;

    let str = compareProgramsStructure(blocks1, blocks2);
    let voc = compareProgramsVocabulary(varNames1, varNames2);

    return Math.max(str, voc).toFixed(0);
};

function compareProgramsStructure(blocks1, blocks2) {
    let sameBlocks = 0;
    for (var i = 0; i < blocks1.length; i++) {
        for (var j = 0; j < blocks2.length; j++) {
            if (blocks1[i].toString() === blocks2[j].toString()) {
                sameBlocks++;
            }
        };
    };
    let prob = Math.min(sameBlocks / Object.keys(blocks1).length,
        sameBlocks / Object.keys(blocks2).length) * 100;
    return prob ? prob : 0;
}

function compareProgramsVocabulary(names1, names2) {
    let sameNames = 0;
    for (var i = 0; i < names1.length; i++) {
        for (var j = 0; j < names2.length; j++) {
            if (names1[i] === names2[j]) {
                sameNames++;
            }
        };
    };
    let prob = Math.min(sameNames / Object.keys(names1).length,
        sameNames / Object.keys(names2).length) * 100;
    return prob ? prob : 0;
}

function getUniqueBlocks(blocks) {
    var seen = {};
    return blocks.filter(function (item) {
        return seen.hasOwnProperty(item.toString()) ? false : (seen[item.toString()] = true);
    });
}

function extractData(ast) {
    let blocks = [];
    let varNames = [];
    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (node.type == 'BlockStatement') {
                let statements = getStatments(node);
                blocks.push(statements);
            }
        },
        leave: function (node, parent) {
            let name = getName(node);
            if (name) {
                name = name.toLowerCase();
                if (varNames.indexOf(name) === -1) {
                    varNames.push(name);
                }
            }
        }
    });
    return {
        blocks,
        varNames
    };
}

function getName(node) {
    let name;
    if (node.name) {
        name = node.name;
    }
    if (node.id) {
        name = node.id.name;
    }
    if (node.key) {
        name = node.key.name;
    }
    return name;
}

function getStatments(block) {
    let statements = [];
    estraverse.traverse(block, {
        enter: function (node, parent) {
            if (meaningfulStat.indexOf(node.type) !== -1) {
                statements.push(node.type);
                let innerBlock = node.body || node.consequent;
                if (innerBlock && hasMeaningfulStat(innerBlock)) {
                    statements.push('start');
                }
            }
        },
        leave: function (node, parent) {
            let innerBlock = node.body || node.consequent;
            if (meaningfulStat.indexOf(node.type) !== -1 &&
                innerBlock &&
                hasMeaningfulStat(innerBlock)) {
                statements.push('end');
            }
        }
    });
    return statements;
}

function hasMeaningfulStat(stat) {
    let flag = false;
    estraverse.traverse(stat, {
        enter: function (node, parent) {
            if (meaningfulStat.indexOf(node.type) != -1) {
                flag = true;
                this.break();
            }
        }
    });
    return flag;
}

function getHash(statArray) {
    let str = statArray.join();
    return crypto
        .createHmac('sha256', salt)
        .update(str)
        .digest('hex');
}

function saveAllFunction(ast) {
    let allFunction = {};
    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (node.type == 'FunctionDeclaration' ||
                node.type == 'FunctionExpression') {
                if (node.id) {
                    let name = node.id.name;
                    allFunction[name] = node.body;
                }
            }
        }
    });
    return allFunction;
}

function replace(ast, allFunction) {
    let used = [];
    let result = estraverse.replace(ast, {
        enter: function (node) {
            if (node.type === 'CallExpression' && node.callee.name) {
                let callee = node.callee.name;
                if (used.indexOf(callee) >= 0) {
                    return node;
                }
                let block = allFunction[callee];
                if (getName(node) !== callee && block) {
                    return block;
                }
            }
        },
        leave: function (node) {
            used.push(getName(node));
        }
    });
    return result;
}

function processAST(ast) {
    let allFunction = saveAllFunction(ast);
    return replace(ast, allFunction);
}
