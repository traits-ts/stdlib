/*
**  @traits-ts/stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@traits-ts/core"

/*  ==== BEGIN OF REDUCED, EMBEDDED PURE-UUID ====  */

/* eslint camelcase: off */

/*  array to hex-string conversion  */
const a2hs = function (bytes: Uint8Array, begin: number, end: number, uppercase: boolean, str: string[], pos: number) {
    const mkNum = function (num: number, uppercase: boolean) {
        let base16 = num.toString(16)
        if (base16.length < 2)
            base16 = "0" + base16
        if (uppercase)
            base16 = base16.toUpperCase()
        return base16
    }
    for (let i = begin; i <= end; i++)
        str[pos++] = mkNum(bytes[i], uppercase)
    return str
}

/*  UI64 constants  */
const UI64_DIGITS     = 8    /* number of digits */
const UI64_DIGIT_BITS = 8    /* number of bits in a digit */
const UI64_DIGIT_BASE = 256  /* the numerical base of a digit */

/*  convert between individual digits and the UI64 representation  */
const ui64_d2i = function (d7: number, d6: number, d5: number, d4: number, d3: number, d2: number, d1: number, d0: number) {
    return [ d0, d1, d2, d3, d4, d5, d6, d7 ]
}

/*  the zero represented as an UI64  */
const ui64_zero = function () {
    return ui64_d2i(0, 0, 0, 0, 0, 0, 0, 0)
}

/*  clone the UI64  */
const ui64_clone = function (x: number[]) {
    return x.slice(0)
}

/*  convert between number and UI64 representation  */
const ui64_n2i = function (n: number) {
    const ui64 = ui64_zero()
    for (let i = 0; i < UI64_DIGITS; i++) {
        ui64[i] = Math.floor(n % UI64_DIGIT_BASE)
        n /= UI64_DIGIT_BASE
    }
    return ui64
}

/*  convert between UI64 representation and number  */
const ui64_i2n = function (x: number[]) {
    let n = 0
    for (let i = UI64_DIGITS - 1; i >= 0; i--) {
        n *= UI64_DIGIT_BASE
        n += x[i]
    }
    return Math.floor(n)
}

/*  add UI64 (y) to UI64 (x) and return overflow/carry as number  */
const ui64_add = function (x: number[], y: number[]) {
    let carry = 0
    for (let i = 0; i < UI64_DIGITS; i++) {
        carry += x[i] + y[i]
        x[i]   = Math.floor(carry % UI64_DIGIT_BASE)
        carry  = Math.floor(carry / UI64_DIGIT_BASE)
    }
    return carry
}

/*  multiply number (n) to UI64 (x) and return overflow/carry as number  */
const ui64_muln = function (x: number[], n: number) {
    let carry = 0
    for (let i = 0; i < UI64_DIGITS; i++) {
        carry += x[i] * n
        x[i]   = Math.floor(carry % UI64_DIGIT_BASE)
        carry  = Math.floor(carry / UI64_DIGIT_BASE)
    }
    return carry
}

/*  multiply UI64 (y) to UI64 (x) and return overflow/carry as UI64  */
const ui64_mul = function (x: number[], y: number[]) {
    let i, j

    /*  clear temporary result buffer zx  */
    const zx = new Array(UI64_DIGITS + UI64_DIGITS)
    for (i = 0; i < (UI64_DIGITS + UI64_DIGITS); i++)
        zx[i] = 0

    /*  perform multiplication operation  */
    let carry
    for (i = 0; i < UI64_DIGITS; i++) {
        /*  calculate partial product and immediately add to zx  */
        carry = 0
        for (j = 0; j < UI64_DIGITS; j++) {
            carry += (x[i] * y[j]) + zx[i + j]
            zx[i + j] = (carry % UI64_DIGIT_BASE)
            carry /= UI64_DIGIT_BASE
        }

        /*  add carry to remaining digits in zx  */
        for ( ; j < UI64_DIGITS + UI64_DIGITS - i; j++) {
            carry += zx[i + j]
            zx[i + j] = (carry % UI64_DIGIT_BASE)
            carry /= UI64_DIGIT_BASE
        }
    }

    /*  provide result by splitting zx into x and ov  */
    for (i = 0; i < UI64_DIGITS; i++)
        x[i] = zx[i]
    return zx.slice(UI64_DIGITS, UI64_DIGITS)
}

/*  AND operation: UI64 (x) &= UI64 (y)  */
const ui64_and = function (x: number[], y: number[]) {
    for (let i = 0; i < UI64_DIGITS; i++)
        x[i] &= y[i]
    return x
}

/*  OR operation: UI64 (x) |= UI64 (y)  */
const ui64_or = function (x: number[], y: number[]) {
    for (let i = 0; i < UI64_DIGITS; i++)
        x[i] |= y[i]
    return x
}

/*  rotate right UI64 (x) by a "s" bits and return overflow/carry as number  */
const ui64_rorn = function (x: number[], s: number) {
    const ov = ui64_zero()
    if ((s % UI64_DIGIT_BITS) !== 0)
        throw new Error("ui64_rorn: only bit rotations supported with a multiple of digit bits")
    const k = Math.floor(s / UI64_DIGIT_BITS)
    for (let i = 0; i < k; i++) {
        let j
        for (j = UI64_DIGITS - 1 - 1; j >= 0; j--)
            ov[j + 1] = ov[j]
        ov[0] = x[0]
        for (j = 0; j < UI64_DIGITS - 1; j++)
            x[j] = x[j + 1]
        x[j] = 0
    }
    return ui64_i2n(ov)
}

/*  rotate right UI64 (x) by a "s" bits and return overflow/carry as number  */
const ui64_ror = function (x: number[], s: number) {
    /*  sanity check shifting  */
    if (s > (UI64_DIGITS * UI64_DIGIT_BITS))
        throw new Error("ui64_ror: invalid number of bits to shift")

    /*  prepare temporary buffer zx  */
    const zx = new Array(UI64_DIGITS + UI64_DIGITS)
    let i
    for (i = 0; i < UI64_DIGITS; i++) {
        zx[i + UI64_DIGITS] = x[i]
        zx[i] = 0
    }

    /*  shift bits inside zx  */
    const k1 = Math.floor(s / UI64_DIGIT_BITS)
    const k2 = s % UI64_DIGIT_BITS
    for (i = k1; i < UI64_DIGITS + UI64_DIGITS - 1; i++) {
        zx[i - k1] =
            ((zx[i] >>> k2) |
                (zx[i + 1] << (UI64_DIGIT_BITS - k2))) &
            ((1 << UI64_DIGIT_BITS) - 1)
    }
    zx[UI64_DIGITS + UI64_DIGITS - 1 - k1] =
        (zx[UI64_DIGITS + UI64_DIGITS - 1] >>> k2) &
        ((1 << UI64_DIGIT_BITS) - 1)
    for (i = UI64_DIGITS + UI64_DIGITS - 1 - k1 + 1; i < UI64_DIGITS + UI64_DIGITS; i++)
        zx[i] = 0

    /*  provide result by splitting zx into x and ov  */
    for (i = 0; i < UI64_DIGITS; i++)
        x[i] = zx[i + UI64_DIGITS]
    return zx.slice(0, UI64_DIGITS)
}

/*  rotate left UI64 (x) by a "s" bits and return overflow/carry as UI64  */
const ui64_rol = function (x: number[], s: number) {
    /*  sanity check shifting  */
    if (s > (UI64_DIGITS * UI64_DIGIT_BITS))
        throw new Error("ui64_rol: invalid number of bits to shift")

    /*  prepare temporary buffer zx  */
    const zx = new Array(UI64_DIGITS + UI64_DIGITS)
    let i
    for (i = 0; i < UI64_DIGITS; i++) {
        zx[i + UI64_DIGITS] = 0
        zx[i] = x[i]
    }

    /*  shift bits inside zx  */
    const k1 = Math.floor(s / UI64_DIGIT_BITS)
    const k2 = s % UI64_DIGIT_BITS
    for (i = UI64_DIGITS - 1 - k1; i > 0; i--) {
        zx[i + k1] =
            ((zx[i] << k2) |
                (zx[i - 1] >>> (UI64_DIGIT_BITS - k2))) &
            ((1 << UI64_DIGIT_BITS) - 1)
    }
    zx[0 + k1] = (zx[0] << k2) & ((1 << UI64_DIGIT_BITS) - 1)
    for (i = 0 + k1 - 1; i >= 0; i--)
        zx[i] = 0

    /*  provide result by splitting zx into x and ov  */
    for (i = 0; i < UI64_DIGITS; i++)
        x[i] = zx[i]
    return zx.slice(UI64_DIGITS, UI64_DIGITS)
}

/*  XOR UI64 (y) onto UI64 (x) and return x  */
const ui64_xor = function (x: number[], y: number[]) {
    for (let i = 0; i < UI64_DIGITS; i++)
        x[i] ^= y[i]
}

/*  PCG Pseudo-Random-Number-Generator (PRNG)  */
class PCG {
    private mul:   number[]
    private inc:   number[]
    private mask:  number[]
    private state: number[]
    constructor (_seed?: number) {
        /*  pre-load some "magic" constants  */
        this.mul   = ui64_d2i(0x58, 0x51, 0xf4, 0x2d, 0x4c, 0x95, 0x7f, 0x2d)
        this.inc   = ui64_d2i(0x14, 0x05, 0x7b, 0x7e, 0xf7, 0x67, 0x81, 0x4f)
        this.mask  = ui64_d2i(0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff)

        /*  generate an initial internal state  */
        this.state = ui64_clone(this.inc)
        this.next()
        ui64_and(this.state, this.mask)
        let arr
        let seed: number[]
        if (_seed !== undefined)
            /*  external seeding  */
            seed = ui64_n2i(_seed >>> 0)
        else if (typeof crypto === "object"
            && typeof crypto.getRandomValues === "function") {
            /*  internal strong seeding with WebCrypto API (in browsers)  */
            arr = new Uint32Array(2)
            crypto.getRandomValues(arr)
            seed = ui64_or(ui64_n2i(arr[0] >>> 0), ui64_ror(ui64_n2i(arr[1] >>> 0), 32))
        }
        else {
            /*  internal weak seeding with Math.random() and Date  */
            seed = ui64_n2i((Math.random() * 0xffffffff) >>> 0)
            ui64_or(seed, ui64_ror(ui64_n2i((new Date()).getTime()), 32))
        }
        ui64_or(this.state, seed)
        this.next()
    }
    next () {
        /*  save current state  */
        const state = ui64_clone(this.state)

        /*  advance internal state  */
        ui64_mul(this.state, this.mul)
        ui64_add(this.state, this.inc)

        /*  calculate: (state ^ (state >> 18)) >> 27  */
        const output = ui64_clone(state)
        ui64_ror(output, 18)
        ui64_xor(output, state)
        ui64_ror(output, 27)

        /*  calculate: state >> 59  */
        const rot = ui64_clone(state)
        ui64_ror(rot, 59)

        /*  calculate: rotate32(xorshifted, rot)  */
        ui64_and(output, this.mask)
        const k = ui64_i2n(rot)
        const output2 = ui64_clone(output)
        ui64_rol(output2, 32 - k)
        ui64_ror(output, k)
        ui64_xor(output, output2)

        /*  return pseudo-random number  */
        return ui64_i2n(output)
    }
}
const pcg = new PCG()

/*  utility function: simple Pseudo Random Number Generator (PRNG)  */
const prng = function (len: number, radix: number) {
    const bytes = []
    for (let i = 0; i < len; i++)
        bytes[i] = (pcg.next() % radix)
    return bytes
}

/*  internal state  */
let time_last = 0
let time_seq  = 0

/*  the API constructor  */
class UUID {
    private uuid = new Uint8Array(16)

    /*  generate UUID version 1 (time and node based)  */
    constructor () {
        let i

        /*  determine current time and time sequence counter  */
        const date = new Date()
        const time_now = date.getTime()
        if (time_now !== time_last)
            time_seq = 0
        else
            time_seq++
        time_last = time_now

        /*  convert time to 100*nsec  */
        const t = ui64_n2i(time_now)
        ui64_muln(t, 1000 * 10)

        /*  adjust for offset between UUID and Unix Epoch time  */
        ui64_add(t, ui64_d2i(0x01, 0xB2, 0x1D, 0xD2, 0x13, 0x81, 0x40, 0x00))

        /*  compensate for low resolution system clock by adding
            the time/tick sequence counter  */
        if (time_seq > 0)
            ui64_add(t, ui64_n2i(time_seq))

        /*  store the 60 LSB of the time in the UUID  */
        let ov
        ov = ui64_rorn(t, 8); this.uuid[3] = (ov & 0xFF)
        ov = ui64_rorn(t, 8); this.uuid[2] = (ov & 0xFF)
        ov = ui64_rorn(t, 8); this.uuid[1] = (ov & 0xFF)
        ov = ui64_rorn(t, 8); this.uuid[0] = (ov & 0xFF)
        ov = ui64_rorn(t, 8); this.uuid[5] = (ov & 0xFF)
        ov = ui64_rorn(t, 8); this.uuid[4] = (ov & 0xFF)
        ov = ui64_rorn(t, 8); this.uuid[7] = (ov & 0xFF)
        ov = ui64_rorn(t, 8); this.uuid[6] = (ov & 0x0F)

        /*  generate a random clock sequence  */
        const clock = prng(2, 255)
        this.uuid[8] = clock[0]
        this.uuid[9] = clock[1]

        /*  generate a random local multicast node address  */
        const node = prng(6, 255)
        node[0] |= 0x01
        node[0] |= 0x02
        for (i = 0; i < 6; i++)
            this.uuid[10 + i] = node[i]

        /*  brand with particular UUID version  */
        this.uuid[6] &= 0x0F
        this.uuid[6] |= (1 << 4)

        /*  brand as UUID letiant 2 (DCE 1.1)  */
        this.uuid[8] &= 0x3F
        this.uuid[8] |= (0x02 << 6)
    }

    /*  API method: format UUID into usual textual representation  */
    format () {
        const arr = new Array(36)
        a2hs(this.uuid,  0,  3, false, arr,  0); arr[8]  = "-"
        a2hs(this.uuid,  4,  5, false, arr,  9); arr[13] = "-"
        a2hs(this.uuid,  6,  7, false, arr, 14); arr[18] = "-"
        a2hs(this.uuid,  8,  9, false, arr, 19); arr[23] = "-"
        a2hs(this.uuid, 10, 15, false, arr, 24)
        return arr.join("")
    }
}

/*  ==== END OF REDUCED, EMBEDDED PURE-UUID ====  */

/*  the API trait "Identifiable<T>"  */
export const Identifiable = trait((base) => class Identifiable extends base {
    /*  internal state  */
    #id: string = (new UUID()).format()

    /*  return unique id  */
    get $id (): string {
        return this.#id
    }
})

