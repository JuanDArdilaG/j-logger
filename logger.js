import R from "ramda";
import chalk from "chalk";
import { inspect } from "util";
import Response from "@juandardilag/returns/Response/Response.js";
/**
 * Function used to create an specific logger
 *
 * @param {Function} logger Print function
 * @param {String} name Name of the current logger
 * @param {String} color Namespace color
 * @param {String} type Type of logger
 * @return {Object} Return a logger with specific methods
 */
let createLogger = R.curry((logger, name, colorizer, type) => {
    // Por defecto apagado el logger y verbose en false
    let on = false;
    let verbose = false;
    // Flag para imprimir el aviso de logger apagado una sola vez
    let flagAvisoLoggerApagado = false;
    let flagAvisoLoggerEncendido = false;
    return {
        /**
         * Print a message with the logger
         *
         * @param {*} msg Message to print
         * @param {String} style Style of message, options: info (default) or error
         */
        log: (msg, style = "info") => {
            if (on) {
                logger(colorizer(style, msg, verbose));
            }
            else if (!flagAvisoLoggerApagado) {
                logger(colorizer("info", "Logger off", false));
                flagAvisoLoggerEncendido = false;
                flagAvisoLoggerApagado = true;
            }
        },
        error: (msg) => logger(colorizer("error", msg, on, verbose)),
        /**
         * Turn on the logger
         */
        on: () => {
            if (!flagAvisoLoggerEncendido) {
                logger(colorizer("info", `Initializing ${name} Logger`, false));
                logger(colorizer("info", addTimeStamp("Waiting Logs"), false));
                flagAvisoLoggerApagado = false;
                flagAvisoLoggerEncendido = true;
            }
            on = true;
        },
        /**
         * Turn off the logger
         */
        off: () => (on = false),
        /**
         * Set verbose mode
         * @param {Boolean} v boolean indicates verbose mode
         */
        verbose: (v) => {
            if (v) {
                verbose = true;
            }
            else {
                verbose = false;
            }
        },
    };
});
/**
 *
 * @param {Function} console Function to charge to print or write
 * @param {String} name Namespace
 * @param {String} color Code of console color
 */
let consoleLogger = (console, name, color) => createLogger(console.log, name, colorizeConsoleMsg(name, "DEBUG", color), "DEBUG");
let colorizeConsoleMsg = R.curry((name, type, color, style, msg, verbose) => {
    const header = buildHeader(name, msg, style, type, color, verbose);
    if (typeof msg !== "string") {
        msg = inspect(msg);
    }
    const styledMessage = styled(msg, style, {
        chalk: chalk.black,
        color: "black",
    });
    const bgColorHeader = pickColors(color).bgColor;
    const bgColorMessage = pickColors(styledMessage.color.label).bgColor;
    const finalMessage = `${bgColorHeader.chalk.bg(`${header} `)}${bgColorMessage.chalk.bg(styledMessage.str)}`;
    return finalMessage;
});
const buildHeader = (name, msg, style, type, color, verbose) => {
    let header = `${chalk.bold.keyword(color)(name.toUpperCase())} ${chalk.bold.keyword(color)("line " + getLineNumber(new Error().stack, name))}`;
    if (verbose) {
        return buildVerboseHeader(header, msg, color, style, type);
    }
    return header;
};
const buildVerboseHeader = (header, msg, color, style, type) => {
    let verboseHeader = `${header} ${type}`;
    const MSG_TYPE = styled(`[${typeof msg}]`, style, {
        chalk: chalk.white,
        color: "white",
    });
    verboseHeader = `${verboseHeader} ${addTimeStamp("", color)} `;
    return `${chalk.keyword(color)(verboseHeader)} ${MSG_TYPE}`;
};
const styled = (string, styleType, defaultStyle = {
    chalk: chalk.black,
    color: "black",
}) => {
    if (styleType === "error") {
        return errorStyle(string);
    }
    else {
        return {
            str: defaultStyle.chalk(string),
            color: mapStringToRGB(defaultStyle.color).data,
        };
    }
};
const errorStyle = (string) => {
    return { str: chalk.red(string), color: mapStringToRGB("red").data };
};
const pickColors = (mainColorString) => {
    //TODO: Usar HSL conversion para cálculo de complementario
    //TODO: Convertir Color en unaclase y hacer las conversiones y cálculos en métodos
    // Definir color de fondo
    const bgColorString = "white";
    let bgColor = mapStringToRGB(bgColorString).data;
    let mainColor = mapStringToRGB(mainColorString).data;
    let contrastOk = verifyContrast(mainColorString, bgColorString);
    if (contrastOk.hasErrors()) {
        console.log("error", contrastOk.errors);
        bgColor = mapStringToRGB(colorOpuesto(bgColorString).data).data;
    }
    else if (contrastOk.data) {
        // Se encontró un opuesto o se aceptó el contraste
        bgColor = contrastOk.data;
    }
    return { bgColor, mainColor };
};
let addTimeStamp = (string, color = "black") => chalk.keyword(color)(`${new Date().toLocaleDateString("es-co", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
})} ${Intl.DateTimeFormat("es", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
}).format(new Date())} ::${string}`);
let getLineNumber = (trace, namefile) => {
    if (!trace)
        return;
    let indexpositionstart = trace.search(namefile);
    let indexpositionend = trace.indexOf("at ", indexpositionstart);
    let number = trace.slice(indexpositionstart, indexpositionend);
    indexpositionstart = number.indexOf(":");
    indexpositionend = number.lastIndexOf(":");
    number = number.slice(indexpositionstart + 1, indexpositionend);
    return number;
};
/**
 * @param coloruno String que representa el color uno
 * @param colordos String que representa el color dos
 * @returns {Response} custom Response with data corresponding to "colordos string" suggested
 */
const verifyContrast = (coloruno, colordos) => {
    const colorRGBUno = mapStringToRGB(coloruno);
    const colorRGBDos = mapStringToRGB(colordos);
    if (colorRGBUno.hasErrors()) {
        // TODO: Permitir agregar colores custom key/value pairs para COLORES de mapStringToRGB
        return Response.failed(colorRGBUno.errors[0]);
    }
    else if (colorRGBDos.hasErrors()) {
        return Response.failed(colorRGBDos.errors[0]);
    }
    else {
        // minimal recommended contrast ratio is 4.5, or 3 for larger font-sizes
        const contrastRatio = contrast(colorRGBUno.data, colorRGBDos.data);
        if (contrastRatio < 4) {
            return mapStringToRGB(colorOpuesto(colordos).data);
        }
        else {
            return Response.success(colorRGBDos.data);
        }
    }
};
const colorOpuesto = (color) => {
    //TODO: Refactorizar
    const OPUESTOS = {
        white: "black",
        black: "white",
    };
    if (color in OPUESTOS) {
        return Response.success(OPUESTOS[color]);
    }
    return Response.failed({ code: "0", message: "No se encontró un opuesto" });
};
const mapStringToRGB = (string) => {
    // TODO: Empezar a usar los r,g,b en vez del keyword
    const COLORES = {
        orange: {
            r: 224,
            g: 119,
            b: 1,
            a: 88,
            label: "orange",
            chalk: { bg: chalk.bgKeyword("orange"), main: chalk.keyword("orange") },
        },
        black: {
            r: 0,
            g: 0,
            b: 0,
            a: 100,
            label: "black",
            chalk: { bg: chalk.bgBlack, main: chalk.black },
        },
        white: {
            r: 255,
            g: 255,
            b: 255,
            a: 100,
            label: "white",
            chalk: { bg: chalk.bgWhite, main: chalk.white },
        },
        red: {
            r: 255,
            g: 0,
            b: 0,
            a: 100,
            label: "red",
            chalk: { bg: chalk.bgRed, main: chalk.red },
        },
    };
    if (string in COLORES) {
        return Response.success(COLORES[string]);
    }
    else {
        return Response.failed({
            code: "mapStringToRGB",
            message: `Color '${string}' no está definido`,
        });
    }
};
const luminanace = (colormapped) => {
    var a = [colormapped.r, colormapped.g, colormapped.b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};
function contrast(colormappeduno, colormappeddos) {
    var lum1 = luminanace(colormappeduno);
    var lum2 = luminanace(colormappeddos);
    var brightest = Math.max(lum1, lum2);
    var darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}
export const CreateLogger = createLogger;
export const ConsoleLogger = consoleLogger;
