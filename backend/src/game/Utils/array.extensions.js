// Extensiones para Array para simular algunos métodos de LINQ

if (!Array.prototype.Sum) {
    Array.prototype.Sum = function () {
        return this.reduce((acc, val) => acc + val, 0);
    };
}

if (!Array.prototype.SumBy) {
    Array.prototype.SumBy = function (selector) {
        return this.reduce((acc, val) => acc + selector(val), 0);
    };
}

if (!Array.prototype.Where) {
    Array.prototype.Where = function (predicate) {
        return this.filter(predicate);
    };
}

if (!Array.prototype.Any) {
    Array.prototype.Any = function (predicate) {
        if (!predicate) {
            return this.length > 0;
        }
        return this.some(predicate);
    };
}
