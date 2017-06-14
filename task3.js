"use strict";

const fs = require("fs"),
    inputFile = process.argv[2] || "task3.in",
    outputFile = process.argv[3] || "task3.out";

let a = "0" + "'".repeat(parseInt(fs.readFileSync(inputFile, "utf-8"))),
    template = fs.readFileSync("template.proof", "utf-8").split("\n").map(s => s.replace(/\s+/g, "")).filter(s => s.length > 0),
    proof = [
    `|-(${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0'`,
    ...template,
    `@a((a+0')*(a+0')=(a*a)+(0''*a)+0')->((${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0')`,
    `(${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0'`
];
fs.writeFileSync(outputFile, proof.join("\n"), "utf-8");