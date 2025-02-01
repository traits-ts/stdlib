/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait } from "@rse/traits"

type ConfigurationKey = symbol | string
type ConfigurationVal = symbol | string | number | boolean
type Configuration    = { [ key: ConfigurationKey ]: ConfigurationVal | Configuration }

/*  the API trait "Configurable<T>"  */
export const Configurable = <T extends Configuration>() =>
    trait((base) => class Configurable extends base {
    /*  internal state  */

    constructor () {
        super()
    }

    /*  (re)-configure state  */
    $configure (configuration: Partial<T>) {
    }
})

