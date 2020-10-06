import R from "ramda";
import chalk, { Chalk } from "chalk";
import { inspect } from "util";
import Response, { IResponse } from "../Returns/Response/Response.js";
import { IError } from "../Returns/Response/Failed.js";

/**
 * Function used to create an specific logger
 *
 * @param {Function} logger Print function
 * @param {String} name Name of the current logger
 * @param {String} color Namespace color
 * @param {String} type Type of logger
 * @return {Object} Return a logger with specific methods
 */
let createLogger = R.curry(
  (logger: any, name: string, colorizer: any, type: string) => {
    // Por defecto apagado el logger y verbose en false
    let on: boolean = false;
    let verbose: boolean = false;
    // Flag para imprimir el aviso de logger apagado una sola vez
    let flagAvisoLoggerApagado: boolean = false;
    let flagAvisoLoggerEncendido: boolean = false;

    return {
      /**
       * Print a message with the logger
       *
       * @param {*} msg Message to print
       * @param {String} style Style of message, options: info (default) or error
       */
      log: (msg: string | object, style: string = "info") => {
        if (on) {
          logger(colorizer(style, msg, verbose));
        } else if (!flagAvisoLoggerApagado) {
          logger(colorizer("info", "Logger off", false));
          flagAvisoLoggerEncendido = false;
          flagAvisoLoggerApagado = true;
        }
      },
      error: (msg: string) => logger(colorizer("error", msg, on, verbose)),
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
      verbose: (v: boolean) => {
        if (v) {
          verbose = true;
        } else {
          verbose = false;
        }
      },
    };
  }
);

/**
 *
 * @param {Function} console Function to charge to print or write
 * @param {String} name Namespace
 * @param {String} color Code of console color
 */
let consoleLogger = (console: any, name: string, color: any) =>
  createLogger(
    console.log,
    name,
    colorizeConsoleMsg(name, "DEBUG", color),
    "DEBUG"
  );

let colorizeConsoleMsg = R.curry(
  (
    name: string,
    type: string,
    color: string,
    style: string,
    msg: string,
    verbose: boolean
  ) => {
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
    const finalMessage = `${bgColorHeader.chalk.bg(
      `${header} `
    )}${bgColorMessage.chalk.bg(styledMessage.str)}`;

    return finalMessage;
  }
);

const buildHeader = (
  name: string,
  msg: string | object,
  style: string,
  type: string,
  color: string,
  verbose: boolean
): string => {
  let header: string = `${chalk.bold.keyword(color)(
    name.toUpperCase()
  )} ${chalk.bold.keyword(color)(
    "line " + getLineNumber(new Error().stack, name)
  )}`;

  if (verbose) {
    return buildVerboseHeader(header, msg, color, style, type);
  }

  return header;
};
const buildVerboseHeader = (
  header: string,
  msg: string | object,
  color: string,
  style: string,
  type: string
): string => {
  let verboseHeader: string = `${header} ${type}`;

  console.log("style", style);
  const MSG_TYPE = styled(`[${typeof msg}]`, style, {
    chalk: chalk.white,
    color: "white",
  });

  verboseHeader = `${verboseHeader} ${addTimeStamp("", color)} `;

  return `${chalk.keyword(color)(verboseHeader)} ${MSG_TYPE}`;
};

const styled = (
  string: string,
  styleType: string,
  defaultStyle: { chalk: Chalk; color: string } = {
    chalk: chalk.black,
    color: "black",
  }
): { str: string; color: Color } => {
  if (styleType === "error") {
    return errorStyle(string);
  } else {
    return {
      str: defaultStyle.chalk(string),
      color: mapStringToRGB(defaultStyle.color).data,
    };
  }
};
const errorStyle = (string: string): { str: string; color: Color } => {
  return { str: chalk.red(string), color: mapStringToRGB("red").data };
};

const pickColors = (
  mainColorString: string
): { bgColor: Color; mainColor: Color } => {
  //TODO: Usar HSL conversion para cálculo de complementario
  //TODO: Convertir Color en unaclase y hacer las conversiones y cálculos en métodos

  // Definir color de fondo
  const bgColorString: string = "white";
  let bgColor: Color = mapStringToRGB(bgColorString).data;
  let mainColor: Color = mapStringToRGB(mainColorString).data;
  let contrastOk = verifyContrast(mainColorString, bgColorString);

  if (contrastOk.hasErrors()) {
    console.log("error", contrastOk.errors);
    bgColor = mapStringToRGB(colorOpuesto(bgColorString).data).data;
  } else if (contrastOk.data) {
    // Se encontró un opuesto o se aceptó el contraste
    bgColor = contrastOk.data;
  }

  return { bgColor, mainColor };
};

let addTimeStamp = (string: string, color: string = "black") =>
  chalk.keyword(color)(
    `${new Date().toLocaleDateString("es-co", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })} ${Intl.DateTimeFormat("es", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date())} ::${string}`
  );

let getLineNumber = (trace: string | undefined, namefile: string) => {
  if (!trace) return;
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
const verifyContrast = (coloruno: string, colordos: string): IResponse => {
  const colorRGBUno = mapStringToRGB(coloruno);
  const colorRGBDos = mapStringToRGB(colordos);

  if (colorRGBUno.hasErrors()) {
    // TODO: Permitir agregar colores custom key/value pairs para COLORES de mapStringToRGB
    return Response.failed(colorRGBUno.errors[0]);
  } else if (colorRGBDos.hasErrors()) {
    return Response.failed(colorRGBDos.errors[0]);
  } else {
    // minimal recommended contrast ratio is 4.5, or 3 for larger font-sizes
    const contrastRatio = contrast(colorRGBUno.data, colorRGBDos.data);
    if (contrastRatio < 4) {
      return mapStringToRGB(colorOpuesto(colordos).data);
    } else {
      return Response.success(colorRGBDos.data);
    }
  }
};

const colorOpuesto = (color: string): IResponse => {
  //TODO: Refactorizar
  const OPUESTOS: Record<string, string> = {
    white: "black",
    black: "white",
  };

  if (color in OPUESTOS) {
    return Response.success(OPUESTOS[color]);
  }

  return Response.failed({ code: "0", message: "No se encontró un opuesto" });
};

const mapStringToRGB = (string: string): IResponse => {
  // TODO: Empezar a usar los r,g,b en vez del keyword
  const COLORES: Record<string, Color> = {
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
  } else {
    return Response.failed({
      code: "mapStringToRGB",
      message: `Color '${string}' no está definido`,
    });
  }
};

interface Color {
  chalk: {
    bg: Chalk;
    main: Chalk;
  };
  label: string;
  r: number;
  g: number;
  b: number;
  a: number;
}

const luminanace = (colormapped: Color) => {
  var a = [colormapped.r, colormapped.g, colormapped.b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};
function contrast(colormappeduno: Color, colormappeddos: Color) {
  var lum1 = luminanace(colormappeduno);
  var lum2 = luminanace(colormappeddos);
  var brightest = Math.max(lum1, lum2);
  var darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export { createLogger, consoleLogger };
