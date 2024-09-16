/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-extend-native */
interface BigInt {
  toJSON: () => string;
}

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export type { BigInt };
