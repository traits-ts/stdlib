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
    name:     string
    CONTINUE: HookResult.CONTINUE
    FINISH:   HookResult.FINISH
    REPEAT:   HookResult.REPEAT
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
    "early": Array<HookCallbackInfo>
    "main":  Array<HookCallbackInfo>
    "late":  Array<HookCallbackInfo>
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
    #hooks = new Map<string, HookCallbacks>()

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
        const callbacks = this.#hooks.get(name)
        if (callbacks !== undefined) {
            /*  provide hook context  */
            const h = {
                name,
                CONTINUE: HookResult.CONTINUE,
                FINISH:   HookResult.FINISH,
                REPEAT:   HookResult.REPEAT
            } satisfies HookContext

            /*  iterate as long as we should repeat  */
            let repeat = true
            while (repeat) {
                /*  assume we should now no longer repeat  */
                repeat = false

                /*  iterate over all hook slots  */
                loop: for (const group of [ "early", "main", "late" ] as Array<HookPosition>) {
                    /*  iterate over all registered hooks  */
                    for (const info of callbacks[group]) {
                        /*  call registered hook  */
                        const result = await info.cb(h, data)
                        if (result === HookResult.REPEAT) {
                            /*  repeat the operation  */
                            repeat = true
                            break loop
                        }
                        else if (result === HookResult.FINISH) {
                            /*  stop the operation  */
                            break loop
                        }
                    }
                }
            }
        }

        /*  provide results  */
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
        if (cbOrUndefined)
            return this.$latch(name, optionsOrCb as LatchOptions, cbOrUndefined)
        else
            return this.$latch(name, optionsOrCb as F)
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
        if (!this.#hooks.has(name)) {
            this.#hooks.set(name, {
                "early": [] as Array<HookCallbackInfo>,
                "main":  [] as Array<HookCallbackInfo>,
                "late":  [] as Array<HookCallbackInfo>
            } satisfies HookCallbacks)
        }

        /*  register the callback  */
        this.#hooks.get(name)![options.pos ?? "main"].push({
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
        const callbacks = this.#hooks.get(name)
        if (callbacks !== undefined) {
            /*  iterate over all groups  */
            for (const group of HookPositionNames) {
                /*  iterate over all registered callbacks  */
                for (let i = 0; i < callbacks[group].length; i++) {
                    const info = callbacks[group][i]
                    if (info.cb === cb) {
                        /*  delete registered callback  */
                        /* eslint @typescript-eslint/no-dynamic-delete: off */
                        delete callbacks[group][i]
                        if (   callbacks["early"].length === 0
                            && callbacks["main"].length  === 0
                            && callbacks["late"].length  === 0)
                            this.#hooks.delete(name)
                        return
                    }
                }
            }
        }
        throw new Error("no such hook latching found")
    }
})
