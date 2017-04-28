"use strict";

/**
 * Lambda calculus experiments: Church booleans,
 * numerals, pairs and standard terms
 *
 * @author Egor Makarenko
 * @see https://habrahabr.ru/post/215807/ : λ-исчисление. Часть первая: история и теория
 * @see https://habrahabr.ru/post/215991/ : λ-исчисление. Часть вторая: практика
 * @see https://habrahabr.ru/post/322052/ : Лямбда-исчисление на JavaScript
 */

const True = t => f => t;
const False = t => f => f;

// `True` returns the first argument
// `False` returns the second argument
console.assert(True(1)(2) === 1);
console.assert(False(1)(2) === 2);

const Not = f => f(False)(True);

// If argument is True, `Not` returns False
// If argument is False, `Not` returns True
console.assert(Not(True) === False);
console.assert(Not(False) === True);

const And = a => b => a(b)(False);
const Or = a => b => a(True)(b);

// If the first argument is True, `And` returns the second
// Otherwise returns False
console.assert(And(False)(False) === False);
console.assert(And(False)(True) === False);
console.assert(And(True)(False) === False);
console.assert(And(True)(True) === True);

// If the first argument is False, `Or` returns the second
// Otherwise returns True
console.assert(Or(False)(False) === False);
console.assert(Or(False)(True) === True);
console.assert(Or(True)(False) === True);
console.assert(Or(True)(True) === True);

const If = c => t => f => c(t)(f);

// `If` returns the boolean function applied to its arguments
console.assert(If(True)(1)(2) === 1);
console.assert(If(False)(1)(2) === 2);

const Zero = f => x => x;
const One = f => x => f(x);
const Two = f => x => f(f(x));
const IsZero = n => n(x => False)(True);

// `Zero` applies f to x zero times
// `One` applies f to x one time
// `Two` applies f to x two times
// `IsZero` is True, if f is not applied to x
console.assert(IsZero(Zero) === True);
console.assert(IsZero(One) === False);
console.assert(IsZero(Two) === False);

const IsEven = n => n(Not)(True);
const IsOdd = n => n(Not)(False);

// `IsEven` applies Not to True n times
// `IsOdd` applies Not to False n times
console.assert(IsEven(Zero) === True);
console.assert(IsOdd(Zero) === False);
console.assert(IsEven(One) === False);
console.assert(IsOdd(One) === True);

const Int = n => n(x => x + 1)(0);

// `Int` evaluates number with zero accumulator and +1 function
console.assert(Int(Zero) === 0);
console.assert(Int(One) === 1);
console.assert(Int(Two) === 2);

const Pair = a => b => (f => f(a)(b));
const First = p => p(True);
const Second = p => p(False);

// `Pair` encapsulates its elements and passes them to f when called
// `First` returns first element by passing True to pair
// `Second` returns second element by passing False to pair
console.assert(First(Pair(1)(2)) === 1);
console.assert(Second(Pair(1)(2)) === 2);

const Inc = n => f => x => f(n(f)(x));

// `Inc` adds one more f call to number got by calling n(f)(x)
console.assert(Int(Inc(Zero)) === 1);
console.assert(Int(Inc(Inc(Zero))) === 2);
console.assert(Int(Inc(Inc(Two))) === 4);

const Dec = n => First(
    n(p => Pair
        (Second(p))
        (Inc(Second(p)))
    )(Pair(Zero)(Zero))
);

// `Dec` applies function (a, b) => (b, b+1) to pair (0, 0)
// n times and returns the first element of the pair
console.assert(Int(Dec(Zero)) === 0);
console.assert(Int(Dec(Inc(Zero))) === 0);
console.assert(Int(Dec(Two)) === 1);

/****************************************************************/

const Peano = i => i === 0 ? Zero : Inc(Peano(i - 1));
console.log(Int(Peano(100000000))); // FIXME Maximum call stack size exceeded

const Add = a => b => a(Inc)(b);
const Sub = a => b => a(Dec)(b);
const Mul = a => b => a(Add(b))(Zero);
const Pow = a => b => b(Mul(a))(One);
const Tetration = a => b => b(Pow(a))(One);


console.log(Int(Dec(Inc(Inc(Inc(Inc(Zero)))))));

console.assert(Int(Inc(Inc(Inc(Inc(Zero))))) === 4);


//console.log(Int(Three));

// let If = b => t => f => b(t)(f);