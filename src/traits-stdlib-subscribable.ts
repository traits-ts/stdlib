/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait }     from "@rse/traits"
import EventEmitter  from "eventemitter2"

type EventMap                      = Record<string, any>
type EventName<T extends EventMap> = string & keyof T
type EventReceiver<T>              = (params: T) => void

interface Unsubscriber {
    unsubscribe (): void
}

type SubscribeOptions = {
    prepend?: boolean
    limit?:   number
    async?:   boolean
}

export const Subscribable = <T extends EventMap>() => trait((base) => class Subscribable extends base {
    /*  internal state  */
    #emitter = new EventEmitter()

    /*  trait construction  */
    constructor (...args: any[]) {
        super(...args)

        /*  configure emitter  */
        this.#emitter.setMaxListeners(100)
    }

    /*  subscribe to an event  */
    $on <K extends EventName<T>>
        (eventName: K, fn: EventReceiver<T[K]>, options = {} as SubscribeOptions) {
        return this.$subscribe(eventName, fn, options)
    }
    $subscribe <K extends EventName<T>>
        (eventName: K, fn: EventReceiver<T[K]>, options = {} as SubscribeOptions) {
        if (options?.limit !== undefined) {
            if (options?.prepend)
                this.#emitter.prependMany(eventName, options.limit, fn,
                    { ...(options?.async ? { async: true } : {}) })
            else
                this.#emitter.many(eventName, options.limit, fn,
                    { ...(options?.async ? { async: true } : {}) })
        }
        else {
            if (options?.prepend)
                this.#emitter.prependListener(eventName, fn,
                    { ...(options?.async ? { async: true } : {}) })
            else
                this.#emitter.on(eventName, fn,
                    { ...(options?.async ? { async: true } : {}) })
        }
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
        this.#emitter.off(eventName, fn)
    }

    /*  emit an event  */
    $emit <K extends EventName<T>>
        (eventName: K, value: T[K]): void {
        this.#emitter.emit(eventName, value)
    }
})

