/**
 * 管道函数: 从左到右组合多个函数
 * 使用方式: pipe(fn1, fn2, fn3)(initialValue)
 */
export const pipe =
  (...fns: Function[]) =>
  (x: any) =>
    fns.reduce((v, f) => f(v), x);

/**
 * 柯里化: 转换多参数函数为单参数链
 * 使用方式: curry((a, b, c) => a + b + c)(1)(2)(3) 或 curry((a, b, c) => a + b + c)(1, 2)(3)
 */
export const curry = (fn: Function) => {
  const arity = fn.length;
  return function curried(...args: any[]) {
    if (args.length >= arity) return fn(...args);
    return (...moreArgs: any[]) => curried(...args, ...moreArgs);
  };
};

/**
 * 组合函数: 从右到左组合多个函数 (与pipe方向相反)
 */
export const compose =
  (...fns: Function[]) =>
  (x: any) =>
    fns.reduceRight((v, f) => f(v), x);

/**
 * 应用函数到值，并返回该值 (用于管道中的调试)
 */
export const tap = (fn: Function) => (value: any) => {
  fn(value);
  return value;
};

/**
 * 创建一个记录日志同时返回原值的函数
 */
export const logTap = (label: string) =>
  tap((value: any) => console.log(`[${label}]`, value));
