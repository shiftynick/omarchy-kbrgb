# kbrgb Keyboard Lighting for Omarchy

A native Omarchy bar widget for the [`kbrgb`](https://github.com/shwetankg07/kbrgb) keyboard-lighting CLI. It adds a keyboard button to the Omarchy bar and opens a panel for controlling supported lighting effects through `kbrgb`; the plugin does not contain a separate keyboard driver or background daemon.

## Requirements

- Omarchy with the Quattro shell
- `kbrgb` installed and available as `kbrgb` in `PATH`
- A keyboard/controller supported by `kbrgb`

The plugin only runs `kbrgb` commands and reads their output. It requests no elevated privileges and performs no shell interpolation, and it has no second Quickshell process.

## Install from a Git repository

```bash
omarchy plugin add https://github.com/shiftynick/omarchy-kbrgb.git --enable
```

The repository must be public for Marketplace installation. Omarchy clones it, validates `manifest.json`, and installs it under `~/.config/omarchy/plugins/<plugin-id>/`.

For local development, place or link the repository contents in:

```text
~/.config/omarchy/plugins/shifty.kbrgb/
```

Then rescan the shell if needed:

```bash
omarchy-shell shell rescanPlugins
```

To remove the plugin, use Omarchy's removal command. It disables the plugin first and backs up a non-Git installation instead of deleting it:

```bash
omarchy plugin remove shifty.kbrgb
```

## Controls

The panel provides:

- Theme colors, static colors, and off
- The effects reported by `kbrgb list`
- Brightness and animation period
- Native EC effects, including speed and reverse where supported
- Color controls for effects that accept color arguments
- Keyboard shortcuts inside the panel: `O` toggles lighting, `T` applies theme colors, `R` toggles reverse, and `A` applies the current settings

The command preview shows the exact argument array that will be sent to `kbrgb`. Effects are discovered at runtime; the color controls are shown only when the selected effect supports a color argument.

## Development and tests

Run the model tests and the source-contract test from the repository root:

```bash
node tests/model.test.js
node tests/qml-contract.test.js
```

Validate the manifest against the installed Omarchy version:

```bash
omarchy plugin validate .
```

The tests are hardware-independent. They do not change keyboard lighting.

## Scope and safety

This plugin controls the lighting state of the attached keyboard when the user selects a setting. It does not manage Plex, media, themes, or other Omarchy services. Review the code and the `kbrgb` documentation before installing third-party shell plugins, because Omarchy plugins run unsandboxed in the long-lived shell process.

## License

MIT. See [LICENSE](LICENSE).

## Author

Shifty
