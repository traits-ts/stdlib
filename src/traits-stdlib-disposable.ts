/*
**  @traits-ts/stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@rse/traits"

/*  the central class instance registry  */
const registry = new FinalizationRegistry((fn: () => void) => {
    if (typeof fn === "function") {
        if (!(fn as any).disposed) {
            (fn as any).disposed = true
            fn()
        }
    }
})

/*  the API trait "Disposable<T>"  */
export const Disposable = trait((base) => class Disposable extends base {
    constructor (...args: any[]) {
        super(...args)

        /*  register class instance  */
        const fn1 = this.$dispose
        if (typeof fn1 !== "function")
            throw new Error("trait Disposable requires a $dispose method to be defined")
        const fn2 = function () { fn1() }
        fn2.disposed = false
        registry.register(this, fn2, this)
    }
})

