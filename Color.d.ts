import { Chalk } from "chalk";
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
declare class Color {
}
export default Color;
export { IColor };
