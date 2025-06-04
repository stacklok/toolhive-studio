import { contextBridge, ipcRenderer } from "electron";
import * as sdk from "./common/api/generated/sdk.gen";

const invokers = Object.fromEntries(
  Object.entries(sdk).map(([k, v]) => [
    k,
    (options: any) => ipcRenderer.invoke(k, options),
  ]),
);

console.log({ invokers });

contextBridge.exposeInMainWorld("electronAPI", invokers);
