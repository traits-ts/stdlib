/*
**  @traits-ts/stdlib - Traits for TypeScript Classes: Standard Library
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import { trait }    from "@rse/traits"

/*  the default types  */
type TraceLogLevels    = string
type TraceLogLevelsDef = "FATAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG"

/*  utility function for formatting a date  */
const formatDate = (date: Date) => {
    const pad = (value: number, len: number) => value.toString().padStart(len, "0")
    const year    = date.getFullYear()
    const month   = pad(date.getMonth() + 1, 2)
    const day     = pad(date.getDate(), 2)
    const hours   = pad(date.getHours(), 2)
    const minutes = pad(date.getMinutes(), 2)
    const seconds = pad(date.getSeconds(), 2)
    const ms      = pad(date.getMilliseconds(), 3)
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
}

/*  the API trait "Traceable<T>"  */
export const Traceable = <T extends TraceLogLevels = TraceLogLevelsDef>() =>
    trait((base) => class Traceable extends base {
    /*  the available log levels  */
    $logLevels = [ "FATAL", "ERROR", "WARNING", "INFO", "DEBUG" ] as T[]

    /*  the current log level  */
    $logLevel  = "INFO" as T

    /*  the log entry output function (dummy default)  */
    $logOutput = (line: string) => {}

    /*  the generic log entry generation method  */
    $log (logLevel: T, msg: string, data?: Record<string, any>) {
        const idxLevel1 = this.$logLevels.indexOf(logLevel)
        const idxLevel2 = this.$logLevels.indexOf(this.$logLevel)
        if (idxLevel1 <= idxLevel2) {
            const timestamp = formatDate(new Date())
            let line = `${timestamp}: [${logLevel}] ${msg}`
            if (data)
                line += " (" + Object.keys(data).map((key) =>
                    `${key}: ${JSON.stringify(data[key])}`).join(", ") + ")"
            this.$logOutput(line)
        }
    }
})

