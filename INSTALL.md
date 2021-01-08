# How to install VSCode and OpenXCOM extensions

## TOC
  - [Install VScode itself](#install-vscode-itself)
  - [Install the extensions](#install-the-extensions)
  - [Optional: Change validation rules from OXC to OXCE](#optional-change-validation-rules-from-oxc-to-oxce)
  - [Open your mod in vscode](#open-your-mod-in-vscode)
  - [Open a rulefile and get modding](#open-a-rulefile-and-get-modding)

## Install VScode itself
* Go to https://code.visualstudio.com/download and download VSCode for your platform
* Install and run it
* It will now look something like this:

  ![clean-code](docs/install/clean-code.png)

## Install the extensions
* Open the marketplace (hit CTRL+SHIFT+X or click the button on the left with four squares):

  ![open-marketplace](docs/install/open-marketplace.png)

* Search the marketplace for `ext:rul` and install both `OpenXCOM Ruleset Tools` and `OpenXCOM Ruleset Linker` by clicking the green install button

  ![search-marketplace](docs/install/search-marketplace.png)

* Wait for installation to finish

## Optional: Change validation rules from OXC to OXCE
This is needed if you're going to be modding OXCE.

  * Open VSCode's settings by pressing CTRL+, or File => Preferences => Settings
  * Type `ruleset validator`

    ![open-settings](docs/install/open-settings.png)
  * Click `oxc` and change it to `oxce`

## Open your mod in vscode
* Now go to `Open Folder`

  ![open-folder](docs/install/open-folder.png)
* Navigate to your mod and select it

  ![select-folder](docs/install/select-folder.png)

## Open a rulefile and get modding
* Navigate to one of your rule files in the explorer on the left, open it and get modding!

  ![open-rulefile-and-get-editing.png](docs/install/open-rulefile-and-get-editing.png)
