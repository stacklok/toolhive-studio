# App icons (macOS)

Icons for macOS use the `.icns` format, which is a container for multiple image
sizes and resolutions. This allows the operating system to choose the best icon
for different contexts, such as the Dock, Finder, and application windows.

The `.icns` is produced using the `iconutil` command on a macOS system. There is
an npm script in the `package.json` file that automates this process `generate-icons:mac`.

To update the application icons, you will need to replace the images in the
following folders:
- `icons/source-files/app-icons/windows-linux/`
- `icons/source-files/app-icons/mac/`

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

After the necessary images are updated, you can run the following command:

```shell
pnpm run generate-icons:mac
```