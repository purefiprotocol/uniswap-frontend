// eslint-disable-next-line @typescript-eslint/ban-types
function throttle(func: Function, delay: number): Function {
  let wait = false;

  return (...args: any[]) => {
    if (wait) {
      return;
    }

    func(...args);
    wait = true;
    setTimeout(() => {
      wait = false;
    }, delay);
  };
}
