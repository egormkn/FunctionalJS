"use strict";

const inputFile = process.argv[2] || "task2.in",
    outputFile = process.argv[3] || "task2.out",
    mode = process.argv[4] || "check";
const fs = require("fs"), newLine = "\n", processingTime = "Время выполнения";

console.time(processingTime);

class Node {
    constructor(key, args) {
        this.key = key;
        this.args = args;
        this.string = this.toString();
    }

    toString() {
        if (this.string !== undefined) return this.string;
        switch (this.key) {
            case "->":
            case "=":
            case "|":
            case "&":
            case "+":
            case "*":
                return this.args.map(arg => `(${arg.string})`).join(this.key);
            case "!":
                return `${this.key}(${this.args[0].string})`;
            case "@":
            case "?":
                return `${this.key}${this.args[0].string}(${this.args[1].string})`;
            case "0":
                return `${this.key}`;
            default:
                if (this.isIncrement()) {
                    return `${this.args[0].string}${"'".repeat(parseInt(this.key))}`;
                } else if (this.isPredicate() || this.isVariable()) {
                    let args = this.args === undefined ? "" : `(${this.args.map(a => `(${a.string})`).join()})`;
                    return this.key + args;
                } else {
                    throw new Error(`Failed to run toString() on '${this.key}'`);
                }
        }
    }

    isIncrement() {
        return /^[1-9]/.test(this.key);
    }

    isPredicate() {
        return /^[=A-Z]/.test(this.key);
    }

    isVariable() {
        return /^[a-z]/.test(this.key);
    }

    isQuantifier() {
        return /^[?@]/.test(this.key);
    }

    hasFree(variableName) {
        if (!/^[a-z][0-9]*$/.test(variableName)) {
            throw new Error("Not a variable passed as argument to hasFree()");
        } else if (this.args === undefined) {
            return this.string === variableName;
        } else if (this.isQuantifier()) {
            let [variable, expression] = this.args;
            return variable.string === variableName ? false : expression.hasFree(variableName);
        } else {
            return this.args.reduce((accumulator, arg) => accumulator || arg.hasFree(variableName), false);
        }
    }

    getFree() {
        if (this.args === undefined) {
            return this.isVariable() ? {[this.string]: true} : {};
        } else if (this.isQuantifier()) {
            let [variable, expression] = this.args, free = expression.getFree();
            delete free[variable.string];
            return free;
        } else {
            return this.args.reduce((accumulator, arg) => Object.assign(accumulator, arg.getFree()), {});
        }
    }

    substitute(map, free = true) {
        if (this.args === undefined) {
            return map.hasOwnProperty(this.key) ? map[this.key] : new Node(this.key);
        } else if (this.isQuantifier()) {
            let [variable, expression] = this.args;
            let newMap = map;
            if (free && map.hasOwnProperty(variable.string)) {
                newMap = Object.assign({}, map);
                delete newMap[variable.string];
            }
            return new Node(this.key, [variable.substitute(free ? {} : map, free), expression.substitute(newMap, free)]);
        } else {
            return new Node(this.key, this.args.map(arg => arg.substitute(map, free)));
        }
    }
}

class Parser {
    constructor(expression) {
        this.expression = expression.replace(/\s+/g, "");
        this.position = 0;
    }

    toString() {
        return `${this.expression.substring(0, this.position)} 
        >>>${this.expression[this.position]}<<< 
        ${this.expression.substring(this.position + 1)}`;
    }

    parseBinary(operator, first, next) {
        if (this.position >= this.expression.length) {
            throw new Error(`Error while parsing '${operator}': ${this.toString()}`);
        }
        let result = first.call(this);
        while (this.expression.startsWith(operator, this.position)) {
            this.position += operator.length;
            result = new Node(operator, [result, next.call(this)]);
        }
        return result;
    }

    parseExpression() {
        return this.parseBinary("->", this.parseDisjunction, this.parseExpression);
    }

    parseDisjunction() {
        return this.parseBinary("|", this.parseConjunction, this.parseConjunction);
    }

    parseConjunction() {
        return this.parseBinary("&", this.parseUnary, this.parseUnary);
    }

    parseUnary() {
        if (this.expression.startsWith("!", this.position)) {
            this.position++;
            return new Node("!", [this.parseUnary()]);
        } else if (this.expression.startsWith("(", this.position)) {
            let i = this.position + 1, balance = 1;
            for (; balance !== 0 && i < this.expression.length; ++i) {
                if (this.expression[i] === "(") balance++;
                if (this.expression[i] === ")") balance--;
            }
            if (i < this.expression.length && /^[=+*'’]/.test(this.expression[i])) {
                return this.parsePredicate();
            }

            this.position++;
            let expr = this.parseExpression();
            if (this.expression.startsWith(")", this.position)) {
                this.position++;
                return expr;
            } else {
                throw new Error(`Parentheses not closed: ${this.toString()}`);
            }
        } else if (/^[@?]/.test(this.expression[this.position])) {
            let char = this.expression[this.position++];
            let args = [this.parseVariable()];
            args.push(this.parseUnary());
            return new Node(char, args);
        } else {
            return this.parsePredicate();
        }
    }

    parseVariable() {
        let name = "";
        if (/^[a-z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/^[0-9]/.test(this.expression[this.position]));
        } else {
            throw new Error(`Error while parsing variable: ${this.toString()}`);
        }
        return new Node(name);
    }

    parsePredicate() {
        let name = "";
        if (/^[A-Z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/^[0-9]/.test(this.expression[this.position]));
            if (this.expression[this.position] === "(") {
                let args = [];
                do {
                    this.position++;
                    args.push(this.parseAdd());
                } while (this.expression[this.position] === ",");
                if (this.expression[this.position] === ")") {
                    this.position++;
                    return new Node(name, args);
                } else {
                    throw new Error(`Parentheses not closed: ${this.toString()}`);
                }
            } else {
                return new Node(name);
            }
        } else {
            let args = [this.parseAdd()];
            if (this.expression[this.position] !== "=") throw new Error(`Equals sign expected: ${this.toString()}`);
            this.position++;
            args.push(this.parseAdd());
            return new Node("=", args);
        }
    }

    parseAdd() {
        return this.parseBinary("+", this.parseMultiply, this.parseMultiply);
    }

    parseMultiply() {
        return this.parseBinary("*", this.parseInc, this.parseInc);
    }

    parseInc() {
        let term = this.parseTerm(), counter = 0;
        while (/^[’']/.test(this.expression[this.position])) {
            this.position++;
            counter++;
        }
        return counter === 0 ? term : new Node("" + counter, [term]);
    }

    parseTerm() {
        let name = "";
        if (/^[a-z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/^[0-9]/.test(this.expression[this.position]));
            if (this.expression[this.position] === "(") {
                let args = [];
                do {
                    this.position++;
                    args.push(this.parseAdd());
                } while (this.expression[this.position] === ",");
                if (this.expression[this.position] === ")") {
                    this.position++;
                    return new Node(name, args);
                } else {
                    throw new Error(`Parentheses not closed: ${this.toString()}`);
                }
            } else {
                return new Node(name);
            }
        } else if (this.expression[this.position] === "(") {
            this.position++;
            let expr = this.parseAdd();
            if (this.expression[this.position] === ")") {
                this.position++;
                return expr;
            } else {
                throw new Error(`Parentheses not closed: ${this.toString()}`);
            }
        } else if (this.expression[this.position] === "0") {
            this.position++;
            return new Node("0");
        } else {
            throw new Error(`Tried to parse something strange: ${this.toString()}`);
        }
    }
}

class Checker {
    constructor(hypothesesData, expressionsData, resultData) {
        this.hypothesesData = [];
        let buffer = "", count = 0;
        for (let i = 0; i < hypothesesData.length; ++i) {
            if (hypothesesData.charAt(i) === "(") count++;
            if (hypothesesData.charAt(i) === ")") count--;
            if (count === 0 && hypothesesData.charAt(i) === ",") {
                this.hypothesesData.push(buffer);
                buffer = "";
            } else {
                buffer += hypothesesData.charAt(i);
            }
            if (i === hypothesesData.length - 1 && buffer.length > 0) this.hypothesesData.push(buffer);
        }
        this.expressionsData = expressionsData;
        this.resultData = resultData;

        this.hypotheses = this.hypothesesData.map(e => new Parser(e).parseExpression());
        this.result = new Parser(resultData).parseExpression();

        this.hypothesesIndex = {};
        for (let i = 0; i < this.hypotheses.length; ++i) {
            this.hypothesesIndex[this.hypotheses[i].string] = i;
        }
    }

    checkProof() {
        this.MP = {};
        this.expressions = [];
        this.expressionsIndex = {};
        let proof = [this.hypothesesData.join() + "|-" + this.resultData], failed = 0;
        for (let i = 0; i < this.expressionsData.length; i++) {
            let result = `Не доказано`;
            try {
                result = this.checkExpression(i, false);
            } catch (error) {
                failed++;
                console.log(`Ошибка в доказательстве формулы номер ${i + 1}: ${error.message}`);
            }
            proof.push(`(${i + 1}) ${this.expressions[i].string} (${result})`);
        }
        if (failed > 0) {
            console.log(`Не доказано: ${failed}`);
        } else if (this.expressions[this.expressions.length - 1].string !== this.result.string) {
            console.log(`Доказано не то, что требовалось`);
        }
        return proof;
    }

    deduceProof() {
        this.MP = {};
        this.expressions = [];
        this.expressionsIndex = {};
        let size = this.hypothesesData.length,
            result = size === 0 ? this.resultData : `(${this.hypothesesData[size - 1]})->(${this.resultData})`,
            proof = [this.hypothesesData.slice(0, -1).join() + "|-" + result];

        for (let i = 0; i < this.expressionsData.length; i++) {
            let result = `Не доказано`;
            try {
                result = this.checkExpression(i, true);
            } catch (error) {
                proof = [`Вывод некорректен начиная с формулы номер ${i + 1}: ${error.message}`];
                break;
            }
            if (size === 0) {
                proof.push(this.expressionsData[i]);
            } else {
                let deduction = this.getDeduction(this.hypotheses[size - 1], this.expressions[i], result);
                proof = proof.concat(deduction);
            }
        }
        return proof;
    }

    getDeduction(hypothesis, expression, result) {
        if (result.startsWith("Пр. вывода @")) {
            let [left, right] = expression.args;
            let [variable, expr] = right.args;
            return Checker.anyDeduction.map(e => e.substitute({"H": hypothesis, "A": left, "B": expr, "x": variable}, false));
        } else if (result.startsWith("Пр. вывода ?")) {
            let [left, right] = expression.args;
            let [variable, expr] = left.args;
            return Checker.existsDeduction.map(e => e.substitute({"H": hypothesis, "A": expr, "B": right, "x": variable}, false));
        } else if (result.startsWith("M.P. ")) {
            let [mp1, mp2] = result.substring("M.P. ".length).split(", ").map(s => Number(s) - 1);
            let [left, right] = this.expressions[mp2].args;
            return Checker.modusPonensDeduction.map(e => e.substitute({"H": hypothesis, "A": left, "B": right}));
        } else if (result.startsWith("Предп. " + this.hypothesesData.length)) {
            return Checker.selfDeduction.map(e => e.substitute({"H": hypothesis}));
        } else if (result.startsWith("Предп. ") || result.startsWith("Сх. акс.")) {
            return Checker.axiomDeduction.map(e => e.substitute({"H": hypothesis, "A": expression}));
        } else {
            throw new Error("Unexpected result");
        }
    }


    checkExpression(index, checkDeduction = false) {
        this.expressions.push(new Parser(this.expressionsData[index]).parseExpression());
        let expression = this.expressions[index], errorText = `Не доказано`;
        this.expressionsIndex[expression.string] = index;
        if (expression.key === "->") {
            let [leftArg, rightArg] = expression.args.map(e => e.string);
            if (this.MP[rightArg] === undefined) {
                this.MP[rightArg] = [];
            }
            this.MP[rightArg].push({full: index, left: leftArg});
            [leftArg, rightArg] = expression.args;

            let quantification = this.checkQuantification(leftArg, rightArg, checkDeduction);
            if (quantification.number !== undefined) {
                if (!quantification.error) {
                    return `Пр. вывода ${quantification.quantifier} из ${quantification.number + 1}`;
                } else if (quantification.hypothesisUsed) {
                    errorText = `используется правило с квантором по переменной ${quantification.variable}, входящей свободно в допущение ${quantification.number + 1}`;
                } else {
                    errorText = `переменная ${quantification.variable} входит свободно в формулу ${quantification.number + 1}`;
                }
            }

            let quantificationAxioms = this.checkQuantificationAxioms(leftArg, rightArg);
            if (quantificationAxioms.axiom !== undefined) {
                if (!quantificationAxioms.error) {
                    return `Сх. акс. A${quantificationAxioms.axiom + 1}`;
                } else {
                    errorText = `терм ${quantificationAxioms.term} не свободен для подстановки в формулу ${quantificationAxioms.formula} вместо переменной ${quantificationAxioms.variable}`;
                }
            }

            let induction = this.checkInduction(leftArg, rightArg);
            if (induction.variable !== undefined) {
                return `Сх. акс. A9`;
            }
        }

        let [mp1, mp2] = this.checkModusPonens(expression);
        if (mp1 !== mp2) {
            return `M.P. ${mp1 + 1}, ${mp2 + 1}`;
        }

        for (let i = 0, array = Checker.logicAxioms; i < array.length; i++) {
            if (this.compareTrees(expression, array[i])) {
                return `Сх. акс. ${i + 1}`;
            }
        }

        for (let i = 0, array = Checker.mathAxioms; i < array.length; i++) {
            if (this.compareTrees(expression, array[i])) {
                return `Сх. акс. A${i + 1}`;
            }
        }

        for (let i = 0, array = this.hypotheses; i < array.length; i++) {
            if (expression.string === array[i].string) {
                return `Предп. ${i + 1}`;
            }
        }

        throw new Error(errorText);
    }

    checkModusPonens(expression) {
        // A, A->B => B
        let index = this.expressions.length, modusPonens = this.MP[expression.string];
        if (modusPonens !== undefined) {
            for (let i = 0; i < modusPonens.length; i++) {
                let leftIndex = this.expressionsIndex[modusPonens[i].left];
                if (leftIndex !== undefined && leftIndex !== index) {
                    return [leftIndex, modusPonens[i].full];
                }
            }
        }
        return [-1, -1];
    }

    checkQuantification(left, right, checkDeduction = false) {
        // If there is no free 'x' in 'A'
        // B->A => ∃xB->A
        // A->B => A->∀xB
        let result = {
            error: false,
            hypothesisUsed: false,
            quantifier: "?",
            number: undefined,
            variable: ""
        };
        if (left.key === "?") {
            let [variable, expression] = left.args;
            result.variable = variable.string;
            let exprString = new Node("->", [expression, right]).string;
            let index = this.expressionsIndex[exprString];
            if (index !== undefined) {
                result.number = index;
                result.error = right.hasFree(result.variable);
                return result;
            }
        }
        if (right.key === "@") {
            let hypothesisFree = this.hypotheses.length > 0 ? this.hypotheses[this.hypotheses.length - 1].getFree() : {};
            result.quantifier = "@";
            let [variable, expression] = right.args;
            result.variable = variable.string;
            let exprString = new Node("->", [left, expression]).string;
            let index = this.expressionsIndex[exprString];
            if (index !== undefined) {
                result.number = index;
                result.hypothesisUsed = checkDeduction && hypothesisFree[variable.string];
                result.error = left.hasFree(result.variable) || result.hypothesisUsed;
                return result;
            }
        }
        return result;
    }

    checkQuantificationAxioms(left, right) {
        // Пусть θ свободно для подстановки вместо x в A.
        // (11) ∀xA->A[x := θ]
        // (12) A[x := θ]->∃xA
        /**
         Терм θ свободен для подстановки в формулу A вместо x,
         если после подстановки θ вместо свободных вхождений x
         ни одно вхождение свободной переменной в θ не станет связанным.

         Запись A[x := θ] будет означать результат подстановки θ в A вместо всех свободных вхождений x.
         */
        let result = {
            error: true,
            term: undefined,
            formula: undefined,
            variable: undefined,
            axiom: undefined
        };
        if (left.key === "@") {
            let [variable, expression] = left.args, variables = {};

            if (this.compareTrees(right, expression, variables)) {
                result.error = false;
                for (let key in variables) {
                    if (key !== variable.string && key === variables[key].string) continue;
                    if (key !== variable.string) return {};
                    if (!this.compareTrees(right, expression, variables, {}, variable.string)) { // Если не свободно для подстановки
                        result.term = variables[key].string;
                        result.formula = expression.string;
                        result.error = true;
                    }
                }
                result.axiom = 10;
                result.variable = variable.string;
            }
        }
        if (right.key === "?" && result.error) {
            let [variable, expression] = right.args, variables = {};
            if (this.compareTrees(left, expression, variables)) {
                result.error = false;
                for (let key in variables) {
                    if (key !== variable.string && key === variables[key].string) continue;
                    if (key !== variable.string) return {};
                    if (!this.compareTrees(left, expression, variables, {}, variable.string)) { // Если не свободно для подстановки
                        result.term = variables[key].string;
                        result.formula = expression.string;
                        result.error = true;
                    }
                }
                result.axiom = 11;
                result.variable = variable.string;
            }
        }
        return result;
    }

    checkInduction(leftArg, rightArg) {
        // (A9) A[x := 0] & ∀x(A->A[x := x'])->A
        // x — некоторая переменная, входящая свободно в A
        if (leftArg.key !== "&") {
            return {};
        }
        let [andLeft, andRight] = leftArg.args;
        if (andRight.key !== "@") {
            return {};
        }
        let [variable, implication] = andRight.args;
        if (implication.key !== "->" || implication.args[0].string !== rightArg.string || !rightArg.hasFree(variable.string)) {
            return {};
        }
        let variables = {}, result = true;
        if (!this.compareTrees(andLeft, rightArg, variables)) {
            return {};
        }
        for (let key in variables) {
            if (key === variables[key].string) continue;
            if (key !== variable.string) return {};
            result = result && (variables[key].string === "0");
        }
        if (!result) {
            return {};
        }

        variables = {};
        if (!this.compareTrees(implication.args[1], rightArg, variables)) {
            return {};
        }
        for (let key in variables) {
            if (key === variables[key].string) continue;
            if (key !== variable.string) return {};
            result = result && (variables[key].string === variable.string + "'");
        }
        if (!result) {
            return {};
        }

        return {
            variable: variable.string
        };
    }

    compareTrees(expression, axiom, variables = {}, boundVariables = {}, fixedVariable) {
        if (expression === undefined || axiom === undefined) {
            return false;
        }
        if (axiom.args === undefined) { // Axiom variable or predicate without arguments
            if (axiom.string === "0") {
                return expression.string === "0";
            } else if (boundVariables.hasOwnProperty(axiom.string)) {
                return boundVariables[axiom.string].string === expression.string;
            } else if (variables.hasOwnProperty(axiom.string)) {
                if (fixedVariable !== undefined && axiom.string === fixedVariable) {
                    let free = expression.getFree();
                    for (let key in boundVariables) {
                        if (free[key]) return false;
                    }
                }
                return variables[axiom.string].string === expression.string;
            } else {
                variables[axiom.string] = expression;
                if (fixedVariable !== undefined && axiom.string === fixedVariable) {
                    let free = expression.getFree();
                    for (let key in boundVariables) {
                        if (free[key]) return false;
                    }
                }
                return true;
            }
        } else if (axiom.key === expression.key && axiom.args.length === expression.args.length) { // Axiom operator
            if (axiom.isQuantifier()) {
                let [axiomVar, axiomExpr] = axiom.args, [exprVar, exprExpr] = expression.args;
                let newBoundVariables = Object.assign({}, boundVariables, {[axiomVar.string]: exprVar});
                return this.compareTrees(exprExpr, axiomExpr, variables, newBoundVariables, fixedVariable);
            } else {
                return axiom.args.reduce((accumulator, element, i) => accumulator && this.compareTrees(expression.args[i], element, variables, boundVariables, fixedVariable), true);
            }
        } else if (axiom.isIncrement() && expression.isIncrement() && Number(axiom.key) < Number(expression.key)) {
            let diff = (Number(expression.key) - Number(axiom.key)).toString();
            return this.compareTrees(new Node(diff, [expression.args[0]]), axiom.args[0], variables, boundVariables, fixedVariable);
        }
        return false;
    }
}

Checker.logicAxioms = [
    "A->B->A",                    // 1
    "(A->B)->(A->B->C)->(A->C)",  // 2
    "A->B->A&B",                  // 3
    "A&B->A",                     // 4
    "A&B->B",                     // 5
    "A->A|B",                     // 6
    "B->A|B",                     // 7
    "(A->C)->(B->C)->(A|B->C)",   // 8
    "(A->B)->(A->!B)->!A",        // 9
    "!!A->A"                      // 10
].map(e => new Parser(e).parseExpression());

Checker.mathAxioms = [
    "a=b->a'=b'",                 // A1
    "(a=b)->(a=c)->(b=c)",        // A2
    "a'=b'->a=b",                 // A3
    "!a'=0",                      // A4
    "a+b'=(a+b)'",                // A5
    "a+0=a",                      // A6
    "a*0=0",                      // A7
    "a*b'=a*b+a"                  // A8
].map(e => new Parser(e).parseExpression());

const readLines = (file) => fs.readFileSync(file, "utf-8").split(newLine).map(s => s.replace(/\s+/g, "")).filter(s => s.length > 0),
    writeLines = (file, data) => fs.writeFileSync(file, data.join(newLine), "utf-8");

Checker.anyDeduction = readLines("any.proof").map(e => new Parser(e).parseExpression());
Checker.existsDeduction = readLines("exists.proof").map(e => new Parser(e).parseExpression());
Checker.selfDeduction = readLines("self.proof").map(e => new Parser(e).parseExpression());
Checker.modusPonensDeduction = readLines("modusponens.proof").map(e => new Parser(e).parseExpression());
Checker.axiomDeduction = readLines("axiom.proof").map(e => new Parser(e).parseExpression());

let data = readLines(inputFile), [hypotheses, result] = data.shift().split("|-"),
    checker = new Checker(hypotheses, data, result);
writeLines(outputFile, mode === "check" ? checker.checkProof() : checker.deduceProof());

console.timeEnd(processingTime);