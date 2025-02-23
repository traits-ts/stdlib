/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@rse/traits"

type EventMap                      = Record<string, any>
type EventName<T extends EventMap> = string & keyof T
type EventReceiver<T>              = (params: T) => void

/*  types for the subscription position  */
type  SubscribePosition      = "early" | "main" | "late"
const SubscribePositionNames = [ "early", "main", "late" ] satisfies Array<SubscribePosition>

/*  type for options of "subscribe"  */
type SubscribeOptions = {
    pos?:    SubscribePosition
    limit?:  number
    async?:  boolean
}

/*  types and interface for internal subscription store  */
type SubscribeCallbackInfo<T extends any = any> = {
    fn:      EventReceiver<T>,
    limit:   number,
    async:   boolean
}
interface SubscribeCallbacks {
    "early": Array<SubscribeCallbackInfo>
    "main":  Array<SubscribeCallbackInfo>
    "late":  Array<SubscribeCallbackInfo>
}

/*  interface of type returned by "subscribe" for unsubscribing  */
interface Unsubscriber {
    unsubscribe (): void
}

export const Subscribable = <T extends EventMap>() => trait((base) => class Subscribable extends base {
    /*  internal state  */
    #subscriptions = new Map<EventName<T>, SubscribeCallbacks>()

    /*  subscribe to an event (alias)  */
    $on <K extends EventName<T>>(
        eventName:      K,
        fn:             EventReceiver<T[K]>
    ): Unsubscriber
    $on <K extends EventName<T>>(
        eventName:      K,
        options:        SubscribeOptions,
        fn?:            EventReceiver<T[K]>
    ): Unsubscriber
    $on <K extends EventName<T>>(
        eventName:      K,
        optionsOrCb:    SubscribeOptions | EventReceiver<T[K]>,
        fn?:            EventReceiver<T[K]>
    ): Unsubscriber {
        if (fn)
            return this.$subscribe(eventName, optionsOrCb as SubscribeOptions, fn)
        else
            return this.$subscribe(eventName, optionsOrCb as EventReceiver<T[K]>)
    }

    /*  subscribe to an event  */
    $subscribe <K extends EventName<T>>(
        eventName:      K,
        fn:             EventReceiver<T[K]>
    ): Unsubscriber
    $subscribe <K extends EventName<T>>(
        eventName:      K,
        options:        SubscribeOptions,
        fn:             EventReceiver<T[K]>
    ): Unsubscriber
    $subscribe <K extends EventName<T>>(
        eventName:      K,
        optionsOrCb:    SubscribeOptions | EventReceiver<T[K]>,
        fn?:            EventReceiver<T[K]>
    ): Unsubscriber {
        /*  determine options despite signature overloading  */
        const options = (fn ? optionsOrCb : {}) as SubscribeOptions
        fn ??= optionsOrCb as EventReceiver<T[K]>

        /*  ensure that the subscription store has slots  */
        if (!this.#subscriptions.has(eventName)) {
            this.#subscriptions.set(eventName, {
                "early": [] as Array<SubscribeCallbackInfo>,
                "main":  [] as Array<SubscribeCallbackInfo>,
                "late":  [] as Array<SubscribeCallbackInfo>
            } satisfies SubscribeCallbacks)
        }

        /*  register the callback  */
        this.#subscriptions.get(eventName)![options.pos ?? "main"].push({
            fn,
            limit: options.limit ?? -1,
            async: options.async ?? false
        })

        /*  provide unsubscriber  */
        const self = this
        return {
            unsubscribe () {
                self.$unsubscribe(eventName, fn)
            }
        } satisfies Unsubscriber
    }

    /*  unsubscribe from an event  */
    $unsubscribe <K extends EventName<T>>
        (eventName: K, fn: EventReceiver<T[K]>): void {
        const callbacks = this.#subscriptions.get(eventName)
        if (callbacks !== undefined) {
            /*  iterate over all groups  */
            for (const group of SubscribePositionNames) {
                /*  iterate over all registered callbacks  */
                for (let i = 0; i < callbacks[group].length; i++) {
                    const info = callbacks[group][i]
                    if (info.fn === fn) {
                        /*  delete registered callback  */
                        /* eslint @typescript-eslint/no-dynamic-delete: off */
                        callbacks[group].splice(i, 1)
                        if (   callbacks["early"].length === 0
                            && callbacks["main"].length  === 0
                            && callbacks["late"].length  === 0)
                            this.#subscriptions.delete(eventName)
                        return
                    }
                }
            }
        }
        throw new Error("no such subcription found")
    }

    /*  emit an event  */
    $emit <K extends EventName<T>>
        (eventName: K, value: T[K]): void {
        const callbacks = this.#subscriptions.get(eventName)
        if (callbacks !== undefined) {
            /*  remember cleanups  */
            const cleanups: Array<() => void> = []

            for (const group of [ "early", "main", "late" ] as Array<SubscribePosition>) {
                /*  iterate over all registered hooks  */
                for (let i = 0; i < callbacks[group].length; i++) {
                    const info = callbacks[group][i]

                    /*  support limit  */
                    if (info.limit === 0) {
                        cleanups.push(() => {
                            callbacks[group].splice(i, 1)
                            if (   callbacks["early"].length === 0
                                && callbacks["main"].length  === 0
                                && callbacks["late"].length  === 0)
                                this.#subscriptions.delete(eventName)
                        })
                        continue
                    }
                    else if (info.limit > 0)
                        info.limit--

                    /*  call registered hook  */
                    if (info.async)
                        setTimeout(() => { info.fn(value) }, 0)
                    else
                        info.fn(value)
                }
            }

            /*  execute cleanup  */
            cleanups.forEach((cb) => { cb() })
        }
    }
})

