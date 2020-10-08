import chalk, { Chalk } from "chalk";

interface IColor {
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

class Color {}

export default Color;
export { IColor };
