"use strict";

const fs = require("fs");
let a = "0" + "'".repeat(parseInt(fs.readFileSync("input.txt", "utf-8"))),
    template = fs.readFileSync("template.proof").split("\n").map(s => s.replace(/\s+/g, "")).filter(s => s.length > 0),
	proof = [
	`|-(${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0'`,
	...template,
	`@a((a+0')*(a+0')=(a*a)+(0''*a)+0')->((${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0')`,
	`((${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0')`
];
fs.writeFileSync("task3.out", proof.join("\n"), "utf-8");