/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@rse/traits"

/*  types for the hook handling  */
type HookMap                                            = Record<string, any>
type HookName<T extends HookMap>                        = string & keyof T
type HookData<T extends HookMap, N extends HookName<T>> = T[N]

/*  types for the hook latch position  */
type  HookPosition      = "early" | "main" | "late"
const HookPositionNames = [ "early", "main", "late" ] satisfies Array<HookPosition>

/*  kinds of hook result  */
enum HookResult {
    CONTINUE = 1,
    FINISH,
    REPEAT
}

/*  interface of hook context  */
interface HookContext {
    CONTINUE: HookResult.CONTINUE
    FINISH:   HookResult.FINISH
    REPEAT:   HookResult.REPEAT
    name:     string
}

/*  types of hook callbacks  */
type HookCallback<T extends any = any> =
    (h: HookContext, data: T) => Promise<HookResult>
type HookCallbackVoid =
    (h: HookContext) => Promise<HookResult>

/*  types and interface for internal hook store  */
type HookCallbackInfo<T extends any = any> = {
    cb: HookCallbackVoid | HookCallback<T>,
    limit: number
}
interface HookCallbacks {
    early: Array<HookCallbackInfo>
    main:  Array<HookCallbackInfo>
    late:  Array<HookCallbackInfo>
}
interface HookStore {
    [ name: string | number | symbol ]: HookCallbacks
}

/*  interface of type returned by "latch" for unlatching  */
interface Unlatcher {
    unlatch (): void
}

/*  type for options of "latch"  */
type LatchOptions = {
    pos?:     HookPosition
    limit?:   number
}

export const Hookable = <T extends HookMap>() => trait((base) => class Hookable extends base {
    /*  internal state  */
    #hooks: HookStore = {}

    /*  trait construction  */
    constructor (params: { [key: string]: unknown } | undefined) {
        super(params)
    }

    /*  define a hook  */
    async $hook<
        N extends HookName<T>>
        (name: N): Promise<void>
    async $hook<
        N extends HookName<T>,
        D extends HookData<T, N>>
        (name: N, data: D): Promise<D>
    async $hook<
        N extends HookName<T>,
        D extends HookData<T, N>>
        (name: N, data?: D): Promise<void | D> {
        if (this.#hooks[name] === undefined)
            return data
        const h = {
            CONTINUE: HookResult.CONTINUE,
            FINISH:   HookResult.FINISH,
            REPEAT:   HookResult.REPEAT,
            name
        } satisfies HookContext
        let repeat = true
        while (repeat) {
            repeat = false
            loop: for (const group of [ "early", "main", "late" ] as Array<HookPosition>) {
                for (const info of this.#hooks[name][group]) {
                    const result = await info.cb(h, data)
                    if (result === HookResult.REPEAT) {
                        repeat = true
                        break loop
                    }
                    else if (result === HookResult.FINISH)
                        break loop
                }
            }
        }
        if (data !== undefined)
            return data
    }

    /*  latch into a hook (alias)  */
    $at<
        N extends HookName<T>,
        F extends (HookData<T, N> extends undefined ?
            HookCallbackVoid : HookCallback<HookData<T, N>>)>
        (name: N, cb: F): Unlatcher
    $at<
        N extends HookName<T>,
        F extends (HookData<T, N> extends undefined ?
            HookCallbackVoid : HookCallback<HookData<T, N>>)>
        (name: N, options: LatchOptions, cb: F): Unlatcher
    $at<
        N extends HookName<T>,
        F extends (HookData<T, N> extends undefined ?
            HookCallbackVoid : HookCallback<HookData<T, N>>)>
        (name: N, optionsOrCb: LatchOptions | F, cbOrUndefined?: F): Unlatcher {
        if (typeof optionsOrCb === "object")
            return this.$latch(name, optionsOrCb, cbOrUndefined!)
        else
            return this.$latch(name, optionsOrCb)
    }

    /*  latch into a hook  */
    $latch<
        N extends HookName<T>,
        F extends (HookData<T, N> extends undefined ?
            HookCallbackVoid : HookCallback<HookData<T, N>>)>
        (name: N, cb: F): Unlatcher
    $latch<
        N extends HookName<T>,
        F extends (HookData<T, N> extends undefined ?
            HookCallbackVoid : HookCallback<HookData<T, N>>)>
        (name: N, options: LatchOptions, cb: F): Unlatcher
    $latch<
        N extends HookName<T>,
        F extends (HookData<T, N> extends undefined ?
            HookCallbackVoid : HookCallback<HookData<T, N>>)>
        (name: N, optionsOrCb: LatchOptions | F, cb?: F): Unlatcher {
        /*  determine options despite signature overloading  */
        const options = (cb ? optionsOrCb : {}) as LatchOptions
        cb ??= optionsOrCb as F

        /*  ensure that the hook store has slots  */
        if (this.#hooks[name] === undefined) {
            this.#hooks[name] = {
                "early": [] as Array<HookCallbackInfo>,
                "main":  [] as Array<HookCallbackInfo>,
                "late":  [] as Array<HookCallbackInfo>
            } satisfies HookCallbacks
        }

        /*  register the callback  */
        this.#hooks[name][options.pos ?? "main"].push({
            cb, limit: options.limit ?? -1
        })

        /*  provide result object  */
        const self = this
        return {
            unlatch () {
                self.$unlatch(name, cb)
            }
        } satisfies Unlatcher
    }

    /*  unlatch from a hook  */
    $unlatch<
        N extends HookName<T>,
        F extends (HookData<T, N> extends undefined ?
            HookCallbackVoid : HookCallback<HookData<T, N>>)>
        (name: N, cb: F): void {
        /*  iterate over all groups  */
        for (const group of HookPositionNames) {
            /*  iterate over all registered callbacks  */
            for (let i = 0; i < this.#hooks[name][group].length; i++) {
                const info = this.#hooks[name][group][i]
                if (info.cb === cb) {
                    /*  delete registered callback  */
                    /* eslint @typescript-eslint/no-dynamic-delete: off */
                    delete this.#hooks[name][group][i]
                    if (this.#hooks[name]["early"].length === 0 &&
                        this.#hooks[name]["main"].length  === 0 &&
                        this.#hooks[name]["late"].length  === 0)
                        delete this.#hooks[name]
                    return
                }
            }
        }
        throw new Error("no such hook latching found")
    }
})
