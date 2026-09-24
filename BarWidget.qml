import QtQuick
import qs.Ui

BarWidget {
  id: root
  moduleName: "shifty.kbrgb"

  readonly property bool opened: panelItem ? panelItem.opened === true : false
  readonly property string statusText: panelItem ? panelItem.statusText : "Keyboard lighting"
  readonly property bool deviceAvailable: panelItem ? panelItem.deviceAvailable : true
  readonly property bool actionRunning: panelItem ? panelItem.actionRunning : false

  property var panelItem: null

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    panelItem = target
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = button
    if ("hostWidget" in target) target.hostWidget = root
  }

  function open() {
    if (panelItem) panelItem.openFromHotkey()
  }
  function close() { if (panelItem) panelItem.close() }
  function togglePanel() { if (panelItem) panelItem.toggle() }
  function closeForPopoutSwitch() { if (panelItem) panelItem.closeForPopoutSwitch() }
  function switchPanel(direction) { if (panelItem) panelItem.switchPanel(direction) }
  readonly property bool popoutSwitchClosing: panelItem ? panelItem.popoutSwitchClosing === true : false

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "⌨"
    dimmed: !root.deviceAvailable
    tooltipText: root.deviceAvailable ? "Keyboard Lighting · kbrgb" : "Keyboard Lighting · device unavailable"

    onPressed: function(mouseButton) {
      if (mouseButton === Qt.LeftButton) root.togglePanel()
    }
  }
}
