# OS & Packaging Support for Deep Links

*Part of the [deep-links skill](../SKILL.md). This is research and prior-art material — may not reflect the current state of implementation.*

---

## Prior work

I took a look at a (somewhat arbitrarily) selected list of popular *open source applications* that were built using Electron and have some sort of deep-linking features:

* VS Code                                                                                                                                                                                                                                                                                                                                      
* GitHub Desktop                                                                                                                                                                                                                                                                                                                                                 
* Rocket.Chat                                                                                                                                                                                                                                                                                                                                                                         
* Mattermost                                                                                                                                                                                                                                                                                                                                                                                                      
* Element                                                                                                                                                                                                                                                                                                                                                                                              
* WebTorrent                                                                                                                                                                                                                                                                                                                                                                                                 
* Mailspring  
* BalenaEtcher (etcher) \- uses Electron Forge  
* Electron Fiddle \- uses Electron Forge  
* Museeks \- used to use Electron Forge; migrated to Tauri later, so abandoned Electron completely

All of these applications rely on Electron’s built-in support for protocol handlers, but all of them basically also employ some sort of “hacks” to make them work in different environments. Mailspring relies on special hacks because it is actually handling mailto: links, but that is not relevant for us. The “hacks” that might be relevant are explained [later in the document](#packaging-issues).

Apart from hacks, there are also some implementation details/patterns that can be observed in those apps, [detailed in this section](#observed-patterns).

### Operating system-specific issues and gotchas

#### **Windows**

On Windows, protocol handlers need to be registered in the Registry. This is more or less straightforward, and [handled by Electron directly](https://www.electronjs.org/docs/latest/api/app#appsetasdefaultprotocolclientprotocol-path-args). But, different packaging solutions can slightly complicate it. This is explained in a [later section](#packaging-issues).

Deep links are passed in using **process.argv** on cold start, and via the **second-instance** event if already running. 

#### **Linux**

For the Electron app to be able to handle the protocol, there needs to be a .*desktop* file with the appropriate MimeType, such as:

```
  [Desktop Entry]                                                                                                                                                                                                                                                                                      
  Name=Mattermost                                                                                                                                                                                                                                                                                      
  Exec=mattermost-flatpak                                                                                                                                                                                                                                                                              
  MimeType=x-scheme-handler/mattermost;     
```

For the .desktop file to be picked up, **update-desktop-database** might need to be run after the installation. An alternative way is to manually call **childProcess.exec('xdg-mime default myApp.desktop x-scheme-handler/myapp')**. *This is taken care of by most “traditional” package managers, so .deb and .rpm packages handle it out of the box.* Xdg-mime can also be used to debug/query current settings on most Linux distributions.

Deep links are passed in using **process.argv** on cold start, and via the **second-instance** event if already running. Because of this, the Exec field of the *.desktop* file needs to contain **%U**.

All major desktop environments protocol handlers (scheme handlers) using .desktop files based on the XDG protocol. This includes Gnome, Kde, Xfce, etc. and covers almost all Linux users.

On most Linux systems, this also lets you open an app deep-link programmatically using xdg-open, not just from the browser. This allows for certain automations but might not be relevant for our use case.

Browsers will typically ask users to confirm that they want to open the deeplink for security reasons.

This is required for the built-in **app.setAsDefaultProtocolClient()** to do anything.

#### 

#### **MacOS**

Deep links on MacOS work quite differently than Linux and Windows. Instead of relying on **second-instance** and **process.argv**, the app must handle the **open-url** event.

The support is based on Launch services. The difference in Electron-side implementation exists because on Mac, the operating system will inherently enforce that a single instance of the app is running. Registration of the service depends on proper packaging. Testing a dev build is possible, but you need to [supply the full path to the binary](https://www.bigbinary.com/blog/deep-link-electron-app) when calling app.setAsDefaultProtocolClient. [This npm package](https://www.npmjs.com/package/electron-deeplink) might also help. Note that protocol associations might be cached on MacOS, which can also create annoying experiences when testing local builds.

There is such a thing as Universal Links, which basically is an even smarter version of the [landing page](#landing-pages) pattern where the links will open directly in the app, even though they are normal web links. But this *only works in Safari*, so we can probably, for now, safely ignore this option.

### Packaging issues {#packaging-issues}

#### **Flatpak** {#flatpak}

Of the applications examined, none of them have an official flathub app. Nevertheless, many of them have community-maintained packages such as Mattermost. Deep links can work properly despite Flatpak apps being in isolated environments.

For deep-linking to work, a .desktop file has to be created with the appropriate MimeType. For instance: 

```
  [Desktop Entry]                                                                                                                                                                                                                                                                                      
  Name=Mattermost                                                                                                                                                                                                                                                                                      
  Exec=mattermost-flatpak                                                                                                                                                                                                                                                                            
  MimeType=x-scheme-handler/mattermost;     
```

For whatever reason, in Mattermost this is handled in the manifest.json which specifies a wrapper script and a build hook that edits the desktop entry to pass URLs to the wrapper script. Wrapper script then executes the sandboxed app:

```json
  {                                                                                                                                                                                                                                                                                                    
    "base": "org.electronjs.Electron2.BaseApp",                                                                                                                                                                                                                                                        
    "finish-args": [                                                                                                                                                                                                                                                                                   
      "--share=network"                                                                                                                                                                                                                                                                                
    ],                                                                                                                                                                                                                                                                                                 
    "modules": [{                                                                                                                                                                                                                                                                                      
      "build_commands": [                                                                                                                                                                                                                                                                              
        "desktop-file-edit --set-key=Exec --set-value='myapp-wrapper %U' ..."                                                                                                                                                                                                                          
      ],                                                                                                                                                                                                                                                                                               
      "sources": [{                                                                                                                                                                                                                                                                                    
        "type": "script",                                                                                                                                                                                                                                                                              
        "commands": ["exec zypak-wrapper /app/main/myapp \"$@\""]                                                                                                                                                                                                                                      
      }]                                                                                                                                                                                                                                                                                               
    }]                                                                                                                                                                                                                                                                                                 
  }  
```

    
Rocket.chat, for example, uses the same method but they build their Flatpak by extracting the .deb file and re-wrapping it. Still, desktop-file-edit is used in order to add the deep linking support.

This is only required when the build system (Snap, Flatpack, AppImages) generates their own .desktop files, or overrides .desktop files, or does not allow that setting to be set for some other reason.

#### **Snapcraft (Ubuntu)**

**In theory**, it’s the same as [Flatpak packages](#flatpak): a .desktop app outside the isolated environment can launch the app that is inside the isolated environment. The process should be effectively the same as for Flatpak files.

However, most desktop apps in Snapcraft are reportedly broken because Snap has a globally allowlisted set of allowed protocols. This is reported in this bug report:  
[https://bugs.launchpad.net/snapd/+bug/1776873](https://bugs.launchpad.net/snapd/+bug/1776873)

Some applications such as Microsoft Teams, Slack and Zoom have working deeplinks through Snap, but it seems like this is implemented by literally hardcoding those protocols in snapd’s source code:  
[https://github.com/canonical/snapd/blob/7e24a0ad5a3db81961ce9491df9e2cf220cc3320/usersession/userd/launcher.go\#L80-L124](https://github.com/canonical/snapd/blob/7e24a0ad5a3db81961ce9491df9e2cf220cc3320/usersession/userd/launcher.go#L80-L124)

In other words, there is no easy way we can make this work, we would literally have to get snapd to implement special support for Toolhive.

Ubuntu does not offer Flatpak out of the box, but the Flatpak system is installable. Plus, Ubuntu does still support .deb packages as well

#### **.deb, .rpm and similar “traditional” Linux packaging formats**

The workflow is “trivial”. The .desktop files are included in the packages, and the package managers trigger database updates so that the protocol handler config is picked up.

These packaging systems do have their own problems, but in theory we do not have to worry about having to do anything special for the deep links to work.

#### **AppImage and .[tar.gz](http://tar.gz) (Linux Tarballs)**

[AppImage files ship with desktop files](https://docs.appimage.org/reference/desktop-integration.html), but these are not automatically installed. The AppImage does install the desktop file if the user uses something like **AppImageLauncher** or **appimaged**.

In all other cases, and for Linux Tarballs, desktop files just have to be installed manually \- or deep linking features will be broken.

The apps that I examined do not do any further hacks for these distribution methods. They either do not use these distribution methods or simply accept the fact that it won’t work \- or rely on the user having AppImageLauncher or appimaged installed. Users can also manually install the .desktop file.

In theory, nothing stops us from just adding a custom script that takes care of this, but it raises the question of whether users would want it \- after all, tarballs and AppImage are a way to have “portable apps”. Some users might not prefer a deep integration with the operating system for this case. We can still support “manually opening” a deep link as a workaround if we want to specifically support this use case. Or we can ask the user explicitly if they want us to create the desktop file for them.

#### **Portable Windows usage (.exe)**

setAsDefaultProtocolClient works just fine in portable .exe files. But, from a UX standpoint, it’s worth considering whether users would want a portable binary to modify system-wide registry and register itself as a protocol handler. Doing this might only make sense with the user’s explicit consent.

Also, just like with the Linux equivalent, if we implement this, the deeplinks will still only work after first launch, because only the first launch would trigger the registry change.

VS-Code and WebTorrent explicitly skip deep-link support for portable mode on Windows:

```ts
// Skip in portable mode: the registered command wouldn't preserve                                                                               
// portable mode settings, causing issues with OAuth flows                                                                                       
if (isWindows && !environmentMainService.isPortable) {                                                                                           
  app.setAsDefaultProtocolClient(protocol, process.execPath, [...]);                                                                             
}  
```

#### **Microsoft Store(MSIX) / AppX packages**

This is basically the Windows equivalent of [Flatpak](#flatpak) packages \- app.setAsDefaultProtocolClient will not have an effect by default. The protocol association has to be instead declared in a manifest file.

#### **Squirrel.Windows**

Squirrel.Windows is Electron Forge’s recommended Windows packaging format. It does not inherently support protocol registration, but does not sabotage app.setAsDefaultProtocolClient \- so the protocol registration should work out of the box after the first launch.

[Squirrel will spawn the app with command line flags on first run](https://github.com/electron/windows-installer/blob/main/README.md?utm_source=chatgpt.com#handling-squirrel-events), updates, and uninstalls. Here, it is possible to call app.setAsDefaultProtocolClient  which will have the effect of immediately registering the protocol.

[There is a potential issue with auto updates, because the binary path includes the version number](https://www.electronjs.org/docs/latest/api/app#appsetasdefaultprotocolclientprotocol-path-args) (e.g. C:\\Users\\you\\AppData\\Local\\Toolhive\\app-1.2.3\\Toolhive.exe). In order to deal with this issue, we have to refer to the “Update.exe” file provided by Squirrel instead:

```ts
// Required for Squirrel to survive updates
const protocolSet = app.setAsDefaultProtocolClient(
  'myapp',
  path.resolve(process.execPath, '..', '..', 'Update.exe'),
  ['--processStart', 'Toolhive.exe', '--process-start-args']
);
```

 **Important**: Squirrel's \--processStart only accepts the exe name. It does not forward additional positional arguments to the spawned process. Since Electron's setAsDefaultProtocolClient appends "%1" (the URL) at the end of the registry command, \--process-start-args must be included so that Squirrel forwards the URL to the app.

#### **MacOS (.app, .dmg)**

In order for deep links to work seamlessly, the .app bundle needs to contain a properly configured Contents/Info.plist file that includes the protocol handler configuration. This will be generated by Electron Forge automatically when configured properly. For instance, for the toolhive:// protocol to work, the following configuration is required in forge.config.ts: 

```ts
packagerConfig: {
  protocols: [
    {
      name: 'ToolHive',
      schemes: ['toolhive']
    }
  ]
}
```

This will inject the following configuration into Info.plist at build time:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>ToolHive</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>toolhive</string>
    </array>
  </dict>
</array>
```

So no manual config is required\!

#### **MacOS (Homebrew)**

Should work if the cask simply wraps the .dmg file.

