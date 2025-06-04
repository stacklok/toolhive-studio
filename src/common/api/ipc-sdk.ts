import * as sdk from "./generated/sdk.gen";

function ipcFromFunction<Options, Result>(fn: (_: Options) => Result) {
  const wrapped = (options: Options) => {
    // @ts-expect-error: not sure if there is a way to have a useful guarantee here at compile time
    window.electronAPI[fn.name](options);
  };

  wrapped.name = fn.name;

  return wrapped;
}

const wrappedModule = Object.fromEntries(
  Object.entries(sdk).map(([k, v]) => [k, ipcFromFunction(v)]),
);

export default wrappedModule;
