/**
 * Array class extension to simulate LINQ methods.
 */
declare global {
    interface Array<T> {
        Sum(this: Array<number>): number;
        SumBy(this: Array<T>, selector: (item: T) => number): number;
        Where(this: Array<T>, predicate: (item: T, index?: number) => boolean): Array<T>;
        Any(this: Array<T>, predicate?: (item: T, index: number) => boolean): boolean;
    }
}

if (!Array.prototype.Sum) {
    Array.prototype.Sum = function (this: Array<number>): number {
        return this.reduce((acc, val) => acc + val, 0);
    };
}

if (!Array.prototype.SumBy) {
    Array.prototype.SumBy = function <T>(this: Array<T>, selector: (item: T) => number): number {
        return this.reduce((acc, val) => acc + selector(val), 0);
    };
}

if (!Array.prototype.Where) {
    Array.prototype.Where = function <T>(this: Array<T>, predicate: (item: T, index?: number) => boolean): Array<T> {
        return this.filter(predicate);
    };
}

if (!Array.prototype.Any) {
    Array.prototype.Any = function <T>(this: Array<T>, predicate?: (item: T, index: number) => boolean): boolean {
        if (!predicate) {
            return this.length > 0;
        }
        return this.some(predicate);
    };
}

export {};
