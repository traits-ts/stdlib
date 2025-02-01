/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@rse/traits"
import UUID      from "pure-uuid"

/*  the API trait "Identifiable<T>"  */
export const Identifiable = trait((base) => class Identifiable extends base {
    /*  internal state  */
    #id: string = (new UUID(1)).format()

    /*  return unique id  */
    get $id (): string {
        return this.#id
    }
})

