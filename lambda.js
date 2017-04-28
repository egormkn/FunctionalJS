"use strict";

/**
 * Created by Egor Makarenko on 28.04.2017.
 * @see https://habrahabr.ru/post/322052/
 */

let True = t => f => t;
let False = t => f => f;

// True returns the first argument
// False returns the second argument
console.assert(True(1)(2) === 1);
console.assert(False(1)(2) === 2);

let Not = f => f(False)(True);

// If argument is True, Not returns False
// If argument is False, Not returns True
console.assert(Not(True) === False);
console.assert(Not(False) === True);

let And = a => b => a(b)(False);
let Or = a => b => a(True)(b);

// If the first argument is True, returns the second
// Otherwise returns False
console.assert(And(False)(False) === False);
console.assert(And(False)(True)  === False);
console.assert(And(True)(False)  === False);
console.assert(And(True)(True)   === True);

// If the first argument is False, returns the second
// Otherwise returns True
console.assert(Or(False)(False) === False);
console.assert(Or(False)(True)  === True);
console.assert(Or(True)(False)  === True);
console.assert(Or(True)(True)   === True);

let Zero = f => x => x;
let Succ = n => f => x => f(n(f)(x));

let Int = n => n(x => x + 1)(0);

console.assert(Int(Succ(Succ(Succ(Succ(Zero))))) === 4);

// let If = b => t => f => b(t)(f);