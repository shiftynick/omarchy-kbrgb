const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const panelPath = path.join(__dirname, '..', 'Panel.qml');
const panel = fs.readFileSync(panelPath, 'utf8');
const barWidgetPath = path.join(__dirname, '..', 'BarWidget.qml');
const barWidget = fs.readFileSync(barWidgetPath, 'utf8');

assert.equal((panel.match(/function requestFor\(/g) || []).length, 1, 'Panel.qml should define requestFor once');
assert.match(panel, /property var actionCommand\s*:/, 'Panel.qml should declare actionCommand before runCommand assigns it');
assert.doesNotMatch(panel, /IpcHandler\s*\{[\s\S]*target:\s*"shifty\.kbrgb"/, 'Panel.qml should rely on the base Panel IPC handler');
assert.match(panel, /function toggle\(\)/, 'Panel.qml should expose toggle for the bar widget');
assert.match(barWidget, /function open\(\)\s*\{[\s\S]*panelItem\.openFromHotkey\(\)/, 'BarWidget.open should use the panel hotkey path');
assert.match(panel, /function toggle\(\)\s*\{[\s\S]*root\.openFromHotkey\(\)/, 'Panel.toggle should use the hotkey path when opening');
assert.match(panel, /function openFromHotkey\(\)[\s\S]*openedFromHotkey\s*=\s*true/, 'Bar-triggered opens should suppress center hover reveal after display');
assert.match(panel, /function close\(\)[\s\S]*root\.controller\.hide\(\)/, 'Panel.qml should own the close lifecycle');
assert.match(panel, /function switchPanel\(direction\)[\s\S]*root\.barIdentity/, 'Panel.qml should switch panels through the injected bar widget identity');
assert.match(panel, /onCloseRequested:\s*root\.close\(\)/, 'KeyboardPanel should use the panel close lifecycle');
assert.match(panel, /onExited:\s*function\(exitCode,\s*exitStatus\)/, 'Process exit handlers should use the Quickshell signal signature');
assert.doesNotMatch(panel, /^import Quickshell$/m, 'Panel.qml does not directly use the Quickshell module');
assert.doesNotMatch(panel, /root\.togglePanel\(\)/, 'Panel.qml should use the base lifecycle toggle function');
assert.match(panel, /command:\s*\["omarchy-launch-floating-terminal-with-presentation",\s*"omarchy-pkg-aur-add kbrgb"\]/, 'Missing kbrgb should install through the Omarchy AUR helper');
assert.match(panel, /visible:\s*root\.kbrgbMissing[\s\S]*onClicked:\s*root\.installKbrgb\(\)/, 'Panel should offer an install button when kbrgb is missing');

console.log('QML contract tests passed');
