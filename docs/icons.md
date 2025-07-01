# Icons

## App Icons

_e.g. The icon shown in the Windows taskbar, macOS Dock, etc_

We use the following formats for application icons:

- **macOS**: ICNS format
- **Windows**: ICO format
- **Linux**: PNG format

These are generated from a set of source images located in `icons/source-files`

We use 2 different icon styles depending on the platform:

| Platform | Style |
| -------- | :---: |
| macOS    | "Squircle" icon with it's own background</br>![macOS icon](../icons/source-files/app-icons/mac/128.png) |
| Windows/Linux    | "Silhouette" icon, no background</br>![Windows/Linux icon](../icons/source-files/app-icons/windows-linux/128.png) |

### Updating app icons

To update the application icons, you will need to replace the images in the
following folders:

- `icons/source-files/app-icons/windows-linux/`
- `icons/source-files/app-icons/mac/`

After the necessary images are updated, you can run the following command:

```shell
pnpm run generate-icons
```

Below is a table listing the required image sizes:

|     Name |      Size | Required<br/>(Windows/Linux) | Required<br/>(macOS) |                                      Preview (Windows/Linux)                                       |                                Preview (macOS)                                 |
| -------: | --------: | :--------------------------: | :------------------: | :------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------: |
|   16.png |     16x16 |           &#10004;           |       &#10004;       |     `/windows-linux/16.png`<br/>![16x16](../icons/source-files/app-icons/windows-linux/16.png)     |     `/mac/16.png`<br/>![16x16](../icons/source-files/app-icons/mac/16.png)     |
|   24.png |     24x24 |           &#10004;           |                      |     `/windows-linux/24.png`<br/>![24x24](../icons/source-files/app-icons/windows-linux/24.png)     |                                                                                |
|   32.png |     32x32 |           &#10004;           |       &#10004;       |     `/windows-linux/32.png`<br/>![32x32](../icons/source-files/app-icons/windows-linux/32.png)     |     `/mac/32.png`<br/>![32x32](../icons/source-files/app-icons/mac/32.png)     |
|   48.png |     48x48 |           &#10004;           |                      |     `/windows-linux/48.png`<br/>![48x48](../icons/source-files/app-icons/windows-linux/48.png)     |                                                                                |
|   64.png |     64x64 |           &#10004;           |       &#10004;       |     `/windows-linux/64.png`<br/>![64x64](../icons/source-files/app-icons/windows-linux/64.png)     |     `/mac/64.png`<br/>![64x64](../icons/source-files/app-icons/mac/64.png)     |
|  128.png |   128x128 |           &#10004;           |       &#10004;       |   `/windows-linux/128.png`<br/>![128x128](../icons/source-files/app-icons/windows-linux/128.png)   |   `/mac/128.png`<br/>![128x128](../icons/source-files/app-icons/mac/128.png)   |
|  256.png |   256x256 |           &#10004;           |       &#10004;       |   `/windows-linux/256.png`<br/>![256x256](../icons/source-files/app-icons/windows-linux/256.png)   |   `/mac/256.png`<br/>![256x256](../icons/source-files/app-icons/mac/256.png)   |
|  512.png |   512x512 |                              |       &#10004;       |   `/windows-linux/512.png`<br/>![512x512](../icons/source-files/app-icons/windows-linux/512.png)   |   `/mac/512.png`<br/>![512x512](../icons/source-files/app-icons/mac/512.png)   |
| 1024.png | 1024x1024 |                              |       &#10004;       | `/windows-linux/1024.png`<br/>![1024x1024](../icons/source-files/app-icons/windows-linux/1024.png) | `/mac/1024.png`<br/>![1024x1024](../icons/source-files/app-icons/mac/1024.png) |

## System Tray Icons

### MacOS

We use `icons/tray-icon.png` & `icons/tray-icon@2x.png`, set to be a template
image with electron's
[`setTemplateImage`](https://www.electronjs.org/docs/latest/api/native-image#imagesettemplateimageoption)
method. This allows the OS to render the icon in a way that matches the system
theme (light/dark mode).

### Windows

We use `icons/icon.ico` as the system tray icon, scaled down to 16x16 pixels.

### Linux

We use `icons/tray-icon-dark.png` & `icons/tray-icon-dark@2x.png`. As most
popular linux distributions use a dark menubar by default anyway. This is also
what [Podman Desktop does](https://github.com/podman-desktop/podman-desktop/blob/f7e10342f58c68166450561aa8a40eb1ae57844d/packages/main/src/tray-animate-icon.ts#L84-L86), which seems to work well for them.


