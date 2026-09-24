import QtQuick
import QtQuick.Controls
import Quickshell.Io
import qs.Commons
import qs.Ui
import "KbrgbModel.js" as Model

Panel {
  id: root
  moduleName: "shifty.kbrgb"
  ipcTarget: "shifty.kbrgb"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  property bool openedFromHotkey: false
  readonly property var barIdentity: hostWidget || root

  property bool actionRunning: false
  property var actionCommand: []
  property string statusMessage: ""
  property bool statusIsError: false
  property bool statusLoaded: false
  property string device: ""
  property string savedCommand: ""
  property string daemon: "not running"
  readonly property bool deviceAvailable: statusLoaded ? device !== "" : true
  readonly property string statusText: statusLoaded ? (deviceAvailable ? "Keyboard lighting ready" : "Keyboard lighting unavailable") : "Checking keyboard lighting"

  property int brightness: 100
  property real period: 3
  property bool reverse: false
  property string effect: "theme"
  property string selectedColor: "aa11ff"
  property var effectRows: []

  property string homeDir: ""
  property string themeColorsFile: ""
  property var themeColors: []
  property bool themeColorsLoaded: false

  readonly property var nativeEffects: ["native/breathe", "native/neon", "native/wave", "native/zoom", "native/meteor", "native/twinkle"]
  readonly property var allEffects: ["theme", "static", "off"].concat(effectRows).concat(nativeEffects)
  readonly property bool colorEnabled: effect === "static" || Model.effectAcceptsColor(effect)
  readonly property bool isNative: effect.indexOf("native/") === 0
  readonly property bool isAnimated: effectRows.indexOf(effect) >= 0
  readonly property bool isOff: effect === "off"
  readonly property real displayPeriod: isNative ? Math.max(0, Math.min(10, period)) : Math.max(0.2, Math.min(60, period))
  readonly property string commandPreview: commandPreviewFor(currentRequest())
  readonly property color selectedColorValue: "#" + selectedColor

  function optionLabel(value) {
    if (value === "theme") return "Theme colors"
    if (value === "static") return "PRESETS"
    if (value === "off") return "Off"
    if (String(value).indexOf("native/") === 0) return "Native · " + String(value).slice(7)
    return String(value)
  }

  function effectLabel(value) { return Model.effectLabel(value) }

  function descriptionFor(value) {
    if (value === "theme") return "Use the current Omarchy theme"
    if (value === "static") return "One color across all four zones"
    if (value === "off") return "Turn the keyboard lighting off"
    return Model.effectDescription(value)
  }

  function effectColorLimit(value) {
    if (Model.EFFECT_COLOR_LIMITS[value] !== undefined) return Model.EFFECT_COLOR_LIMITS[value]
    if (Model.NATIVE_EFFECTS[value] !== undefined) return Model.NATIVE_EFFECTS[value] ? 1 : 0
    return 0
  }

  function requestFor(effectValue, brightnessValue, periodValue, colorValue) {
    var value = String(effectValue || "theme")
    var bright = Model.clamp(brightnessValue, 1, 100)
    var speed = periodValue === null || periodValue === undefined ? 3 : Number(periodValue)
    if (value === "off") return Model.offCommand()
    if (value === "static") return Model.staticCommandWithReverse(colorValue || selectedColor, bright, reverse)
    if (value === "theme") return Model.themeCommand(themeColors, bright)
    if (value.indexOf("native/") === 0) return Model.nativeCommandWithReverse(value, bright, speed, colorValue || selectedColor, reverse)
    if (effectColorLimit(value) > 0) return Model.effectCommandWithReverse(value, bright, speed, colorValue || selectedColor, reverse)
    return Model.effectCommandWithReverse(value, bright, speed, null, reverse)
  }

  function applyStatus(text) {
    var parsed = Model.parseStatus(text)
    device = parsed.device
    savedCommand = parsed.saved
    daemon = parsed.daemon
    var saved = Model.parseSavedState(parsed.saved)
    if (parsed.saved) {
      brightness = saved.brightness
      period = saved.period === null ? 3 : saved.period
      effect = saved.effect
      reverse = saved.reverse
      if (saved.args.length > 0) {
        var colors = saved.args.filter(function(c) { return Model.normalizeHex(c) })
        if (colors.length > 0) selectedColor = Model.normalizeHex(colors[0])
      }
      if (themeColorsLoaded && saved.args.length === 4) {
        var matches = true
        for (var i = 0; i < 4; i++) {
          if (Model.normalizeHex(saved.args[i]) !== themeColors[i]) { matches = false; break }
        }
        if (matches) effect = "theme"
      }
    }
    if (parsed.device) {
      statusMessage = "Ready · " + parsed.device
      statusIsError = false
    } else {
      statusMessage = "Keyboard controller not found"
      statusIsError = true
    }
    statusLoaded = true
  }

  function refreshStatus() {
    if (statusProcess.running) return
    root.loadThemeColors()
    statusProcess.running = true
  }

  function loadThemeColors() {
    if (themeColorsFile === "") return
    if (themeColorsProcess.running) return
    themeColorsProcess.command = ["cat", themeColorsFile]
    themeColorsProcess.running = true
  }

  function statusOnExit(code) {
    if (code === 0) applyStatus(statusStdout.text)
    else {
      statusMessage = statusStderr.text.trim() || "Could not read kbrgb status"
      statusIsError = true
      statusLoaded = true
    }
  }

  function setStatusFromProcess(code, stdout, stderr) {
    if (code === 0) {
      statusMessage = "Applied · " + effect
      statusIsError = false
      refreshStatus()
    } else {
      statusMessage = (stderr || stdout || "kbrgb command failed").trim().split("\n").slice(-1)[0]
      statusIsError = true
    }
    actionRunning = false
  }

  function runCommand(command) {
    if (actionRunning || !command || command.length === 0) return
    actionRunning = true
    actionCommand = command
    actionProcess.command = command
    actionProcess.running = true
  }

  function currentRequest() {
    if (isOff) return Model.offCommand()
    if (effect === "static") return Model.staticCommandWithReverse(selectedColor, brightness, reverse)
    if (effect === "theme") return Model.themeCommand(themeColors, brightness)
    if (isNative) return Model.nativeCommandWithReverse(effect, brightness, displayPeriod, selectedColor, reverse)
    if (effectColorLimit(effect) > 0) return Model.effectCommandWithReverse(effect, brightness, displayPeriod, selectedColor, reverse)
    return Model.effectCommandWithReverse(effect, brightness, displayPeriod, null, reverse)
  }

  function commandPreviewFor(request) {
    if (!request || !request.command) return ""
    return request.command.join(" ")
  }

  function applyCurrent() { runCommand(currentRequest().command) }
  function toggleLighting() {
    runCommand(isOff ? Model.staticCommandWithReverse(selectedColor, brightness, reverse).command : Model.offCommand().command)
  }
  function applyTheme() { runCommand(Model.themeCommand(themeColors, brightness).command) }
  function refresh() { refreshStatus(); refreshEffectList() }
  function setCenterHoverRevealSuppressed(value) {
    if (root.bar && typeof root.bar.setCenterHoverRevealSuppressed === "function")
      root.bar.setCenterHoverRevealSuppressed(value)
    else if (root.bar && "centerHoverRevealSuppressed" in root.bar)
      root.bar.centerHoverRevealSuppressed = value
  }

  function open() {
    openedFromHotkey = false
    setCenterHoverRevealSuppressed(false)
    root.controller.show()
    refreshStatus()
    refreshEffectList()
  }

  function openFromHotkey() {
    if (root.opened) return
    openedFromHotkey = true
    root.controller.show()
    refreshStatus()
    refreshEffectList()
    Qt.callLater(function() {
      if (root.opened) setCenterHoverRevealSuppressed(true)
    })
  }

  function close() {
    setCenterHoverRevealSuppressed(false)
    root.controller.hide()
  }

  function toggle() {
    if (root.opened) root.close()
    else root.openFromHotkey()
  }
  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.barIdentity, direction)
    return false
  }

  function setEffect(value) {
    if (value === "") return
    effect = String(value)
  }

  function effectPeriodChanged(value) {
    return String(value).indexOf("native/") === 0 || value === "off" || value === "theme" || value === "static"
  }

  function defaultPeriodFor(value) {
    if (String(value).indexOf("native/") === 0) return 5
    var defaults = {
      "breathe": 3, "rainbow": 8, "wave": 4, "snake": 2.2, "meteor": 1.8,
      "police": 0.9, "sparkle": 1, "fire": 1, "heartbeat": 1.6, "aurora": 20,
      "ocean": 5, "lava": 1, "matrix": 1, "candle": 1, "storm": 1, "disco": 0.5,
      "duel": 2.6, "shadow": 2.4, "ripple": 3.5, "chase": 1.2, "strobe": 0.3,
      "cpuheat": 4, "battery": 6, "typewriter": 1, "keyflash": 1, "wpmheat": 1,
      "zen": 30, "flow": 30, "load": 1, "clock": 8, "netpulse": 1, "pomo": 25,
      "prism": 3, "glitch": 1, "eruption": 1, "redalert": 1.6, "supernova": 6,
      "shockwave": 2.5
    }
    return defaults[value] || 3
  }

  function effectOptions() {
    var list = [
      { value: "theme", label: "Theme colors" },
      { value: "static", label: "PRESETS" },
      { value: "off", label: "Off" }
    ]
    for (var i = 0; i < effectRows.length; i++) {
      list.push({ value: effectRows[i], label: Model.effectLabel(effectRows[i]) })
    }
    for (var j = 0; j < nativeEffects.length; j++) {
      list.push({ value: nativeEffects[j], label: Model.effectLabel(nativeEffects[j]) })
    }
    return list
  }

  function staticPreviewColor() { return "#" + selectedColor }

  Component.onCompleted: {
    effectRows = []
    refreshEffectList()
    if (!homeProcess.running) homeProcess.running = true
    refreshStatus()
  }

  Process {
    id: statusProcess
    running: false
    command: ["kbrgb", "status"]
    stdout: StdioCollector { id: statusStdout; waitForEnd: true }
    stderr: StdioCollector { id: statusStderr; waitForEnd: true }
    onExited: function(exitCode, exitStatus) { root.statusOnExit(exitCode) }
  }

  Process {
    id: listProcess
    running: false
    command: ["kbrgb", "list"]
    stdout: StdioCollector { id: listStdout; waitForEnd: true }
    stderr: StdioCollector { id: listStderr; waitForEnd: true }
    onExited: function(exitCode, exitStatus) {
      if (exitCode === 0) {
        var values = String(listStdout.text || "").split(/\r?\n/).map(function(s) { return s.trim() }).filter(function(s) { return s !== "" })
        root.effectRows = values
        if (root.effectRows.indexOf(root.effect) < 0 && root.effect !== "theme" && root.effect !== "static" && root.effect !== "off") root.effect = "prism"
      }
    }
  }

  Process {
    id: actionProcess
    running: false
    stdout: StdioCollector { id: actionStdout; waitForEnd: true }
    stderr: StdioCollector { id: actionStderr; waitForEnd: true }
    onExited: function(exitCode, exitStatus) { root.setStatusFromProcess(exitCode, actionStdout.text, actionStderr.text) }
  }

  Process {
    id: homeProcess
    running: false
    command: ["printenv", "HOME"]
    stdout: StdioCollector { id: homeStdout; waitForEnd: true }
    onExited: function(exitCode, exitStatus) {
      if (exitCode !== 0) return
      var home = String(homeStdout.text || "").trim()
      if (home === "") return
      root.homeDir = home
      root.themeColorsFile = home + "/.local/state/omarchy/current/theme/colors.toml"
      root.loadThemeColors()
    }
  }

  Process {
    id: themeColorsProcess
    running: false
    command: []
    stdout: StdioCollector { id: themeColorsStdout; waitForEnd: true }
    onExited: function(exitCode, exitStatus) {
      root.themeColors = exitCode === 0 ? Model.parseThemeToml(themeColorsStdout.text) : []
      root.themeColorsLoaded = root.themeColors.length === 4
    }
  }

  function refreshEffectList() {
    if (!listProcess.running) listProcess.running = true
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(420))
    contentHeight: panel.fittedContentHeight(panelColumn.implicitHeight, Style.space(680))

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onTextKey: function(text) {
        if (text === "o" || text === "O") root.toggleLighting()
        else if (text === "t" || text === "T") root.applyTheme()
        else if (text === "r" || text === "R") root.reverse = !root.reverse
        else if (text === "a" || text === "A") root.applyCurrent()
      }

      ScrollView {
        id: scrollArea
        anchors.fill: parent
        clip: true
        ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
        ScrollBar.vertical.policy: panelColumn.implicitHeight > height ? ScrollBar.AsNeeded : ScrollBar.AlwaysOff
        Binding {
          target: scrollArea.contentItem
          property: "interactive"
          value: panelColumn.implicitHeight > scrollArea.height
        }

        Column {
          id: panelColumn
          width: scrollArea.availableWidth
          spacing: Style.space(14)

          Item {
            width: parent.width
            implicitHeight: Math.max(heroTitle.implicitHeight, heroSubtitle.implicitHeight, powerSwitch.implicitHeight)

            Text {
              id: heroTitle
              anchors.left: parent.left
              anchors.verticalCenter: parent.verticalCenter
              text: "KEYBOARD LIGHTING"
              color: root.barForeground
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.title
              font.bold: true
            }

            Text {
              id: heroSubtitle
              anchors.left: parent.left
              anchors.top: heroTitle.bottom
              anchors.topMargin: Style.space(3)
              anchors.right: powerSwitch.left
              anchors.rightMargin: Style.space(12)
              text: root.statusLoaded ? root.statusMessage : "Checking kbrgb…"
              color: root.statusIsError ? (root.bar ? root.bar.urgent : Color.urgent) : Qt.darker(root.barForeground, 1.35)
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.caption
              elide: Text.ElideRight
              width: parent.width - heroTitle.width - powerSwitch.width - Style.space(12)
            }

            ToggleSwitch {
              id: powerSwitch
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              checked: !root.isOff
              busy: root.actionRunning
              foreground: root.barForeground
              onToggled: root.toggleLighting()
            }
          }

          PanelSeparator { foreground: root.barForeground }

          PanelSectionHeader {
            text: "MODE"
            foreground: root.barForeground
            fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
            width: parent.width
          }

          Grid {
            width: parent.width
            columns: 3
            rowSpacing: Style.space(7)
            columnSpacing: Style.space(7)

            Button {
              width: (parent.width - parent.columnSpacing * 2) / 3
              text: "Theme"
              selected: root.effect === "theme"
              foreground: root.barForeground
              fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
              fontSize: Style.font.bodySmall
              horizontalPadding: Style.space(7)
              onClicked: { root.setEffect("theme"); root.applyCurrent() }
            }

            Button {
              width: (parent.width - parent.columnSpacing * 2) / 3
              text: "PRESETS"
              selected: root.effect === "static"
              foreground: root.barForeground
              fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
              fontSize: Style.font.bodySmall
              horizontalPadding: Style.space(7)
              onClicked: { root.setEffect("static"); root.applyCurrent() }
            }

            Button {
              width: (parent.width - parent.columnSpacing * 2) / 3
              text: "Off"
              selected: root.effect === "off"
              foreground: root.barForeground
              fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
              fontSize: Style.font.bodySmall
              horizontalPadding: Style.space(7)
              onClicked: { root.setEffect("off"); root.applyCurrent() }
            }
          }

          Dropdown {
            id: modeDropdown
            width: parent.width
            label: "EFFECT"
            showLabel: false
            value: root.effect
            options: root.effectOptions()
            foreground: root.barForeground
            fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
            onChanged: function(value) {
              root.setEffect(value)
              root.applyCurrent()
            }
          }

          Text {
            width: parent.width
            text: root.descriptionFor(root.effect)
            color: Qt.darker(root.barForeground, 1.45)
            font.family: root.bar ? root.bar.fontFamily : Style.font.family
            font.pixelSize: Style.font.caption
            wrapMode: Text.WordWrap
            height: implicitHeight
          }

          PanelSeparator { foreground: root.barForeground }

          PanelSectionHeader {
            text: "BRIGHTNESS"
            foreground: root.barForeground
            fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
            width: parent.width
          }

          Item {
            width: parent.width
            implicitHeight: Math.max(brightnessSlider.implicitHeight, brightnessValue.implicitHeight)
            PanelSlider {
              id: brightnessSlider
              anchors.left: parent.left
              anchors.right: brightnessValue.left
              anchors.rightMargin: Style.space(12)
              anchors.verticalCenter: parent.verticalCenter
              value: root.brightness
              minimum: 1
              maximum: 100
              integer: true
              step: 1
              bar: root.bar
              onMoved: function(value) { root.brightness = Math.round(value) }
              onReleased: function(value) { root.brightness = Math.round(value); root.applyCurrent() }
            }
            Text {
              id: brightnessValue
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              text: root.brightness + "%"
              color: root.barForeground
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.body
              font.bold: true
            }
          }

          Item {
            width: parent.width
            visible: root.isAnimated || root.isNative
            implicitHeight: visible ? Math.max(periodSlider.implicitHeight, periodValue.implicitHeight) : 0
            PanelSlider {
              id: periodSlider
              anchors.left: parent.left
              anchors.right: periodValue.left
              anchors.rightMargin: Style.space(12)
              anchors.verticalCenter: parent.verticalCenter
              value: root.displayPeriod
              minimum: root.isNative ? 0 : 0.2
              maximum: root.isNative ? 10 : 60
              step: root.isNative ? 1 : 0.1
              integer: root.isNative
              bar: root.bar
              onMoved: function(value) { root.period = root.isNative ? Math.round(value) : value }
              onReleased: function(value) { root.period = root.isNative ? Math.round(value) : value; root.applyCurrent() }
            }
            Text {
              id: periodValue
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              text: root.isNative ? "Speed " + Math.round(root.displayPeriod) : root.displayPeriod.toFixed(1) + "s"
              color: root.barForeground
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.body
              font.bold: true
            }
          }

          Row {
            width: parent.width
            spacing: Style.space(8)
            visible: root.isNative
            Button {
              text: root.reverse ? "Reverse: on" : "Reverse: off"
              selected: root.reverse
              foreground: root.barForeground
              fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
              fontSize: Style.font.bodySmall
              horizontalPadding: Style.space(10)
              onClicked: { root.reverse = !root.reverse; root.applyCurrent() }
            }
            Button {
              text: "Apply"
              foreground: root.barForeground
              fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
              fontSize: Style.font.bodySmall
              horizontalPadding: Style.space(14)
              onClicked: root.applyCurrent()
            }
          }

          PanelSeparator { foreground: root.barForeground; visible: root.colorEnabled }

          PanelSectionHeader {
            text: "COLOR"
            foreground: root.barForeground
            fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
            width: parent.width
            visible: root.colorEnabled
          }

          Item {
            width: parent.width
            visible: root.colorEnabled
            implicitHeight: colorRow.implicitHeight

            Row {
              id: colorRow
              width: parent.width
              spacing: Style.space(8)

              BorderSurface {
                width: Style.space(42)
                height: width
                radius: width / 2
                color: root.selectedColorValue
                borderSpec: Border.flat(root.bar.background, Style.space(2))
              }

              BorderSurface {
                id: hueStrip
                width: parent.width - colorValue.width - Style.space(8) - Style.space(42) - Style.space(8)
                height: Style.space(28)
                radius: height / 2
                gradient: Gradient {
                  GradientStop { position: 0.0; color: "#ff0000" }
                  GradientStop { position: 0.17; color: "#ffff00" }
                  GradientStop { position: 0.33; color: "#00ff00" }
                  GradientStop { position: 0.5; color: "#00ffff" }
                  GradientStop { position: 0.67; color: "#0000ff" }
                  GradientStop { position: 0.83; color: "#ff00ff" }
                  GradientStop { position: 1.0; color: "#ff0000" }
                }
                borderSpec: Border.flat(root.bar.background, Style.space(1))
              }

              Text {
                id: colorValue
                width: Style.space(66)
                anchors.verticalCenter: parent.verticalCenter
                text: "#" + root.selectedColor
                color: root.barForeground
                font.family: root.bar ? root.bar.fontFamily : Style.font.family
                font.pixelSize: Style.font.bodySmall
                font.bold: true
                horizontalAlignment: Text.AlignRight
              }
            }

            Row {
              anchors.top: colorRow.bottom
              anchors.topMargin: Style.space(7)
              spacing: Style.space(6)
              Repeater {
                model: ["ff2a2a", "ffb300", "ffe95c", "00e676", "00b8d4", "2979ff", "7c4dff", "d500f9", "ff4081", "ffffff"]
                delegate: BorderSurface {
                  required property string modelData
                  width: Style.space(20)
                  height: width
                  radius: width / 2
                  color: "#" + modelData
                  borderSpec: root.selectedColor === modelData
                    ? Border.flat(root.barForeground, Style.space(2))
                    : Border.flat(root.bar.background, Style.space(1))
                  MouseArea {
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: { root.selectedColor = modelData; if (root.effect === "static" || root.colorEnabled) root.applyCurrent() }
                  }
                }
              }
            }
          }

          PanelSeparator { foreground: root.barForeground }

          Item {
            width: parent.width
            implicitHeight: commandText.implicitHeight
            Text {
              id: commandText
              width: parent.width
              text: root.commandPreview
              color: Qt.darker(root.barForeground, 1.65)
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.caption
              wrapMode: Text.WrapAnywhere
              elide: Text.ElideRight
              maximumLineCount: 2
            }
          }

          Button {
            width: parent.width
            text: root.actionRunning ? "Applying…" : "Apply lighting"
            enabled: !root.actionRunning && root.deviceAvailable
            foreground: root.barForeground
            fontFamily: root.bar ? root.bar.fontFamily : Style.font.family
            fontSize: Style.font.body
            horizontalPadding: Style.space(14)
            onClicked: root.applyCurrent()
          }
        }
      }
    }
  }
}
