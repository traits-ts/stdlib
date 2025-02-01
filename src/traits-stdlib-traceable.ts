/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait }    from "@rse/traits"
import moment       from "moment"

type TraceLogLevels    = string[]
type TraceLogLevelsDef = "FATAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG"

/*  the API trait "Traceable<T>"  */
export const Traceable = <T extends TraceLogLevels = TraceLogLevelsDef>() =>
    trait((base) => class Traceable extends base {
    /*  internal state  */
    #emitter = new EventEmitter()

    /*  the public configuration  */
    $logLevels = [ "FATAL", "ERROR", "WARNING", "INFO", "DEBUG" ]
    $logLevel  = "INFO"
    $logOutput = (line: string) => { console.log(line) }

    /*  (re)-configure state  */
    $log (logLevel: T, message: string, data?: Record<string, any>) {
         if (logLevel <= this.$logLevel) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            let line = `[${timestamp}]: [${levels[level].name}] ${msg}`
            if (data)
                line += " (" + Object.keys(data).map((key) =>
                    `${key}: ${JSON.stringify(data[key])}`).join(", ") + ")"
        }
    }
})

