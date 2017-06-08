"use strict";

/*********************** Input file grammar ***********************
 *
 *        File ::= Header ‘\n’ Proof
 *      Header ::= [{Expression ‘,’}∗ Expression] ‘|-’ Expression
 *       Proof ::= {Expression ‘\n’}∗
 *  Expression ::= Disjunction
 *               | Disjunction ‘->’ Expression
 * Disjunction ::= Conjunction
 *               | Disjunction ‘|’ Conjunction
 * Conjunction ::= Unary
 *               | Conjunction ‘&’ Unary
 *       Unary ::= Predicate
 *               | ‘!’ Unary
 *               | ‘(’ Expression ‘)’
 *               | (‘@’|‘?’) Variable Unary
 *    Variable ::= (‘a’...‘z’){‘0’...‘9’}∗
 *   Predicate ::= (‘A’...‘Z’){‘0’...‘9’}∗ [‘(’ Term {‘,’ Term}∗ ‘)’]
 *               | Term ‘=’ Term
 *        Term ::= Add
 *               | Term ‘+’ Add
 *         Add ::= Multiply
 *               | Add ‘*’ Multiply
 *    Multiply ::= (‘a’...‘z’){‘0’...‘9’}∗ ‘(’ Term {‘,’ Term}∗ ‘)’
 *               | Variable
 *               | ‘(’ Term ‘)’
 *               | ‘0’
 *               | Multiply ‘’’
 *
 */

const inputFile = process.argv[2] || "task2.in";
const outputFile = process.argv[3] || "task2.out";

let Node = function (key, args) {
    this.key = key;
    this.args = args;
    this.string = this.toString();
};

Node.prototype = {
    toString: function () {
        if (this.string !== undefined) {
            return this.string;
        }
        switch (this.key) {
            case "->":
            case "=":
            case "|":
            case "&":
            case "+":
            case "*":
                return this.args.map(arg => "(" + arg.string + ")").join(this.key);
            case "!":
            case "@":
            case "?":
                return this.key + this.args.map(arg => arg.string).join("");
            case "0":
                return this.key;
            default:
                if (this.isIncrement()) {
                    return this.args[0].string + new Array(parseInt(this.key) + 1).join("'");
                } else if (this.isPredicate() || this.isVariable()) {
                    return this.key + (this.args === undefined ? "" : "(" + this.args.map(a => a.string).join(",") + ")");
                } else {
                    throw new Error("Failed to run toString() on '" + this.key + "'");
                }
        }
    },
    isIncrement: function () {
        return /[1-9]+/.test(this.key);
    },
    isPredicate: function () {
        return /[=A-Z]/.test(this.key.charAt(0));
    },
    isVariable: function () {
        return /[a-z][0-9]*/.test(this.key);
    },
    hasFree: function (variable) {
        if (!/[a-z][0-9]*/.test(variable)) {
            throw new Error("Not a variable passed as argument to hasFree()");
        }
        if (/[?@]/.test(this.key)) {
            let [variableArg, expressionArg] = this.args;
            return variableArg.string === variable ? false : expressionArg.hasFree(variable);
        } else if (this.string === variable) {
            return true;
        } else if (this.args === undefined) {
            return false;
        }
        return this.args.reduce((accumulator, arg) => accumulator || arg.hasFree(variable), false);
    }
};

let Parser = function (expression) {
    this.expression = expression.replace(/\s+/g, "");
    this.position = 0;
};

Parser.prototype = {
    toString: function () {
        return "Parser[position: " + this.position + ", expression: " + this.expression + "]";
    },
    parseBinary: function (operator, first, next, binary) {
        if (this.position >= this.expression.length) {
            throw new Error("Error while parsing '" + operator + "': " + this.toString());
        }
        let args = [first.call(this)];
        while (this.expression.startsWith(operator, this.position)) {
            this.position += operator.length;
            args.push(next.call(this));
            if (binary) break;
        }
        return args.length === 1 ? args[0] : new Node(operator, args);
    },
    parseExpression: function () {
        return this.parseBinary("->", this.parseDisjunction, this.parseExpression, true);
    },
    parseDisjunction: function () {
        return this.parseBinary("|", this.parseConjunction, this.parseConjunction, false);
    },
    parseConjunction: function () {
        return this.parseBinary("&", this.parseUnary, this.parseUnary, false);
    },
    parseUnary: function () {
        if (this.expression.startsWith("!", this.position)) {
            this.position++;
            return new Node("!", [this.parseUnary()]);
        } else if (this.expression.startsWith("(", this.position)) {
            this.position++;
            let expr = this.parseExpression();
            if (this.expression.startsWith(")", this.position)) {
                this.position++;
                return expr;
            } else {
                throw new Error("Parentheses not closed: " + this.toString());
            }
        } else if (this.expression.startsWith("@", this.position)
            || this.expression.startsWith("?", this.position)) {
            let char = this.expression[this.position++];
            let args = [this.parseVariable()];
            args.push(this.parseUnary());
            return new Node(char, args);
        } else {
            return this.parsePredicate();
        }
    },
    parseVariable: function () {
        let name = "";
        if (/[a-z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/[0-9]/.test(this.expression[this.position]));
        } else {
            throw new Error("Error while parsing variable: " + this.toString());
        }
        return new Node(name);
    },
    parsePredicate: function () {
        let name = "";
        if (/[A-Z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/[0-9]/.test(this.expression[this.position]));
            if (this.expression[this.position] === "(") {
                this.position++;
                let args = [this.parseAdd()];
                while (this.expression[this.position] === ",") {
                    this.position++;
                    args.push(this.parseAdd());
                }
                if (this.expression[this.position] === ")") {
                    this.position++;
                    return new Node(name, args);
                } else {
                    throw new Error("Parentheses not closed: " + this.toString());
                }
            } else {
                return new Node(name);
            }
        } else {
            let args = [this.parseAdd()];
            if (this.expression[this.position++] !== "=") throw new Error("Equals sign expected: " + this.toString());
            args.push(this.parseAdd());
            return new Node("=", args);
        }
    },
    parseAdd: function () {
        return this.parseBinary("+", this.parseMultiply, this.parseMultiply, false);
    },
    parseMultiply: function () {
        return this.parseBinary("*", this.parseInc, this.parseInc, false);
    },
    parseInc: function () {
        let term = this.parseTerm();
        let counter = 0;
        while (this.expression.startsWith("’", this.position) || this.expression.startsWith("'", this.position)) {
            this.position++;
            counter++;
        }
        return counter === 0 ? term : new Node("" + counter, [term]);
    },
    parseTerm: function () {
        let name = "";
        if (/[a-z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/[0-9]/.test(this.expression[this.position]));
            if (this.expression[this.position] === "(") {
                this.position++;
                let args = [this.parseAdd()];
                while (this.expression[this.position] === ",") {
                    this.position++;
                    args.push(this.parseAdd());
                }
                if (this.expression[this.position] === ")") {
                    this.position++;
                    return new Node(name, args);
                } else {
                    throw new Error("Parentheses not closed: " + this.toString());
                }
            } else {
                return new Node(name);
            }
        } else if (this.expression.startsWith("(", this.position)) {
            this.position++;
            let expr = this.parseAdd();
            if (this.expression.startsWith(")", this.position)) {
                this.position++;
                return expr;
            } else {
                throw new Error("Parentheses not closed: " + this.toString());
            }
        } else if (this.expression.startsWith("0", this.position)) {
            this.position++;
            return new Node("0");
        } else {
            throw new Error("Tried to parse something strange: " + this.toString());
        }
    }
};

let Checker = function (hypotheses, data, result) {
    this.hypotheses = hypotheses;
    this.data = data;
    this.result = result;
};

Checker.prototype = {
    logicAxioms: [
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
    ].map(e => new Parser(e).parseExpression()),
    mathAxioms: [
        "a=b->a'=b'",                 // A1
        "(a=b)->(a=c)->(b=c)",        // A2
        "a'=b'->a=b",                 // A3
        "!a'=0",                      // A4
        "a+b'=(a+b)'",                // A5
        "a+0=a",                      // A6
        "a*0=0",                      // A7
        "a*b'=a*b+a"                  // A8
    ].map(e => new Parser(e).parseExpression()),
    expressions: [],
    expressionsIndex: {},
    MP: {},
    checkProof: function () {
        let proof = [this.hypotheses.join() + "|-" + this.result];

        this.hypotheses = this.hypotheses.map(h => new Parser(h).parseExpression());
        this.hypothesesIndex = this.hypotheses.reduce((accumulator, current, index) => {
            accumulator[current.string] = index;
            return accumulator;
        }, {});

        for (let i = 0; i < this.data.length; i++) {
            let result = "Не доказано";
            try {
                result = this.checkExpression(new Parser(this.data[i]).parseExpression());
            } catch (error) {
                console.log("Вывод некорректен начиная с формулы номер " + (i + 1) + ": " + error.message);
            }
            proof.push("(" + (i + 1) + ") " + this.data[i] + " (" + result + ")");
        }
        return proof;
    },
    deduceProof: function () {

    },
    checkExpression: function (expression) {
        let index = this.expressions.length;
        this.expressions.push(expression);
        this.expressionsIndex[expression.string] = index;
        if (expression.key === "->") {
            let [leftArg, rightArg] = expression.args.map(e => e.string);
            if (this.MP[rightArg] === undefined) {
                this.MP[rightArg] = [];
            }
            this.MP[rightArg].push({full: index, left: leftArg});
            [leftArg, rightArg] = expression.args;

            let quantification = this.checkQuantification(leftArg, rightArg);
            if (quantification.number !== undefined) {
                if (!quantification.error) {
                    return "Пр. вывода " + quantification.quantifier + " из " + (quantification.hypothesisUsed ? "гипотезы " : "") + (quantification.number + 1);
                } else if (hypothesisUsed) {
                    throw new Error("используется правило с квантором по переменной " + quantification.variable + ", входящей свободно в допущение " + (quantification.number + 1));
                } else {
                    throw new Error("переменная " + quantification.variable + " входит свободно в формулу " + (quantification.number + 1));
                }
            }

            let quantificationAxioms = this.checkQuantificationAxioms(leftArg, rightArg);
            if (quantificationAxioms.axiom !== undefined) {
                if (!quantificationAxioms.error) {
                    return "Сх. акс. A" + (quantificationAxioms.axiom + 1);
                } else {
                    return "терм " + quantificationAxioms.term + " не свободен для подстановки в формулу " + quantificationAxioms.formula + " вместо переменной " + quantificationAxioms.variable;
                }
            }
        }

        let [mp1, mp2] = this.checkModusPonens(expression);
        if (mp1 !== mp2) {
            return "M.P. " + (mp1 + 1) + ", " + (mp2 + 1);
        }

        for (let i = 0, array = this.logicAxioms; i < array.length; i++) {
            if (this.compareTrees(expression, array[i], {})) {
                return "Сх. акс. " + (i + 1);
            }
        }

        for (let i = 0, array = this.mathAxioms; i < array.length; i++) {
            if (this.compareTrees(expression, array[i], {})) {
                return "Сх. акс. A" + (i + 1);
            }
        }

        for (let i = 0, array = this.hypotheses; i < array.length; i++) {
            if (this.compareTrees(expression, array[i], {})) {
                return "Предп. " + (i + 1);
            }
        }


        // TODO: A9
        /*
         (A9) A[x := 0] & ∀x(A → A[x := x']) → A

         В схеме аксиом (A9) A — некоторая формула исчисления предикатов
         и x — некоторая переменная, входящая свободно в A.
         */

        throw new Error("Не доказано");
    },
    checkModusPonens: function (expression) {
        // A, A → B => B
        let index = this.expressions.length;
        let MPInfo = this.MP[expression.string];
        if (MPInfo !== undefined) {
            for (let i = 0; i < MPInfo.length; i++) {
                let leftIndex = this.expressionsIndex[MPInfo[i].left];
                if (leftIndex !== undefined && leftIndex !== index) {
                    return [leftIndex, MPInfo[i].full];
                }
            }
        }
        return [-1, -1];
    },
    checkQuantification: function (left, right) {
        // If there is no free 'x' in 'A'
        // B → A => ∃xB → A
        // A → B => A → ∀xB
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
            let index = this.expressionsIndex[new Node("->", [expression, right]).string];
            if (index !== undefined) {
                result.number = index;
                result.error = right.hasFree(result.variable);
                return result;
            }
            index = this.hypothesesIndex[new Node("->", [expression, right]).string];
            if (index !== undefined) {
                result.number = index;
                result.error = right.hasFree(result.variable);
                result.hypothesisUsed = true;
                return result;
            }
        } else if (right.key === "@") {
            result.quantifier = "@";
            let [variable, expression] = right.args;
            result.variable = variable.string;
            let index = this.expressionsIndex[new Node("->", [left, expression]).string];
            if (index !== undefined) {
                result.number = index;
                result.error = left.hasFree(result.variable);
                return result;
            }
            index = this.hypothesesIndex[new Node("->", [left, expression]).string];
            if (index !== undefined) {
                result.number = index;
                result.error = left.hasFree(result.variable);
                result.hypothesisUsed = true;
                return result;
            }
        }
        return result;
    },
    checkQuantificationAxioms: function (left, right) {
        // TODO
        /**
         Те вхождения переменных,
         которые не являются связанными или связывающими, назовем свободными.
         Формула, не имеющая свободных вхождений переменных, называется замкнутой.

         Определение 6.6. Будем говорить, что терм θ свободен для подстановки
         в формулу ψ вместо x (или просто свободен для подстановки вместо x),
         если после подстановки θ вместо свободных вхождений x ни одно вхождение
         свободной переменной в θ не станет связанным.
         Запись A[x := θ] будет означать результат
         подстановки θ в ψ вместо всех свободных вхождений x.
         */
        // Пусть θ свободно для подстановки вместо x в A.
        // (11) ∀xA → A[x := θ]
        // (12) A[x := θ] → ∃xA
        let result = {
            error: false,
            term: undefined,
            formula: undefined,
            variable: undefined,
            axiom: undefined
        };
        if (left.key === "@") {
            let [variable, expression] = left.args, variables = {};
            if (this.compareTrees(right, expression, variables)) {
                for (let key in variables) {
                    if (key !== variable.string) {
                        return {};
                    }
                    result.axiom = 10;
                    result.variable = variable.string;
                    if (false) { // Если не свободно для подстановки
                        result.term = variables[key].string;
                        result.formula = expression.string;
                    }
                }
            }
        } else if (right.key === "?") {
            let [variable, expression] = right.args, variables = {};
            if (this.compareTrees(left, expression, variables)) {
                for (let key in variables) {
                    if (key !== variable.string) {
                        return {};
                    }
                    result.axiom = 11;
                    result.variable = variable.string;
                    if (false) { // Если не свободно для подстановки
                        result.term = variables[key].string;
                        result.formula = expression.string;
                    }
                }
            }
        }
        return result;
    },
    compareTrees: function (expression, axiom, variables) {
        if (expression === undefined || axiom === undefined) {
            return false;
        }
        let [axiomKey, expressionKey] = [axiom, expression].map(e => e.key);
        let [axiomArgs, expressionArgs] = [axiom, expression].map(e => e.args);
        let [axiomString, expressionString] = [axiom, expression].map(e => e.toString());
        let zeroString = new Node("0").toString();
        if (axiomArgs === undefined) { // Axiom variable or predicate without arguments
            if (axiomString === zeroString) {
                return expressionString === zeroString;
            } else if (axiomString in variables) {
                return variables[axiomString].toString() === expressionString;
            } else {
                variables[axiomString] = expression;
                return true;
            }
        } else if (axiomKey === expressionKey && axiomArgs.length <= expressionArgs.length) { // Axiom operator
            let res = true;
            for (let i = 0; i < axiomArgs.length; i++) {
                res = res && this.compareTrees(expressionArgs[i], axiomArgs[i], variables);
            }
            return res;
        } else if (axiom.isIncrement() && expression.isIncrement() && Number(axiomKey) < Number(expressionKey)) {
            let diff = (Number(expressionKey) - Number(axiomKey)).toString();
            return this.compareTrees(new Node(diff, [expressionArgs[0]]), axiomArgs[0], variables);
        }
        return false;
    }
};

String.prototype.splitExpressions = function (separator) {
    let arr = [], buffer = "", count = 0;
    for (let i = 0; i < this.length; ++i) {
        if (this.charAt(i) === "(") count++;
        if (this.charAt(i) === ")") count--;
        if (count === 0 && this.charAt(i) === separator) {
            arr.push(buffer);
            buffer = "";
        } else {
            buffer += this.charAt(i);
        }
        if (i === this.length - 1 && buffer.length > 0) arr.push(buffer);
    }
    return arr;
};

const fs = require("fs"), timer = "Время выполнения";
console.time(timer);
let data = fs.readFileSync(inputFile, "utf-8").split("\n").map(s => s.replace(/\s+/g, "")).filter(s => s.length > 0);
let [hypotheses, result] = data.shift().split("|-");
fs.writeFileSync(outputFile, new Checker(hypotheses.splitExpressions(","), data, result).checkProof().join("\n"), "utf-8");
console.timeEnd(timer);