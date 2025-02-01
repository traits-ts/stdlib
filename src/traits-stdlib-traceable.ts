/*
**  @rse/traits-stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait }    from "@rse/traits"
import moment       from "moment"

type TraceLogLevels    = string
type TraceLogLevelsDef = "FATAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG"

/*  the API trait "Traceable<T>"  */
export const Traceable = <T extends TraceLogLevels = TraceLogLevelsDef>() =>
    trait((base) => class Traceable extends base {
    /*  the public configuration  */
    $logLevels = [ "FATAL", "ERROR", "WARNING", "INFO", "DEBUG" ] as T[]
    $logLevel  = "INFO" as T
    $logOutput = (line: string) => { console.log(line) }

    /*  (re)-configure state  */
    $log (logLevel: T, msg: string, data?: Record<string, any>) {
        const idxLevel1 = this.$logLevels.indexOf(logLevel)
        const idxLevel2 = this.$logLevels.indexOf(this.$logLevel)
        if (idxLevel1 <= idxLevel2) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            let line = `[${timestamp}]: [${logLevel}] ${msg}`
            if (data)
                line += " (" + Object.keys(data).map((key) =>
                    `${key}: ${JSON.stringify(data[key])}`).join(", ") + ")"
        }
    }
})

