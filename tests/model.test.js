const assert = require('node:assert/strict');
const Model = require('../KbrgbModel.js');

assert.equal(Model.normalizeHex('#Aa11FF'), 'aa11ff');
assert.equal(Model.normalizeHex('Aa11FF'), 'aa11ff');
assert.equal(Model.normalizeHex('not-a-color'), '');
assert.equal(Model.hexToRgb('aa11ff').red, 170);
assert.equal(Model.hexToRgb('aa11ff').green, 17);
assert.equal(Model.hexToRgb('aa11ff').blue, 255);
assert.equal(Model.rgbToHex({ red: 170, green: 17, blue: 255 }), 'aa11ff');
assert.equal(Model.hsvToHex({ h: 0, s: 1, v: 1 }), 'ff0000');
assert.equal(Model.hsvToHex({ h: 1 / 3, s: 1, v: 1 }), '00ff00');
assert.equal(Model.hsvToHex({ h: 2 / 3, s: 1, v: 1 }), '0000ff');
assert.equal(Model.hsvToHex({ h: 0, s: 0, v: 0.5 }), '808080');
assert.equal(Model.clamp(-1, 0, 100), 0);
assert.equal(Model.clamp(101, 0, 100), 100);
assert.equal(Model.clamp(42, 0, 100), 42);
assert.equal(Model.clamp(3.6, 1, 10), 3.6);

assert.deepEqual(Model.parseSavedState('-b 100 -s 3.0 prism'), {
  brightness: 100,
  period: 3,
  effect: 'prism',
  reverse: false,
  args: []
});
assert.deepEqual(Model.parseSavedState('-b 55 rainbow'), {
  brightness: 55,
  period: null,
  effect: 'rainbow',
  reverse: false,
  args: []
});
assert.deepEqual(Model.parseSavedState('-b 80 -s 1.25 -r wave'), {
  brightness: 80,
  period: 1.25,
  effect: 'wave',
  reverse: true,
  args: []
});
assert.deepEqual(Model.parseSavedState('aa11ff'), {
  brightness: 100,
  period: null,
  effect: 'static',
  reverse: false,
  args: ['aa11ff']
});
assert.deepEqual(Model.parseSavedState('-b 1 off'), {
  brightness: 1,
  period: null,
  effect: 'off',
  reverse: false,
  args: []
});
assert.deepEqual(Model.parseSavedState('garbage'), Model.emptyState());
assert.deepEqual(Model.parseSavedState('__proto__'), Model.emptyState());
assert.deepEqual(Model.parseSavedState('constructor'), Model.emptyState());
assert.deepEqual(Model.parseSavedState('native/not-a-real-effect'), Model.emptyState());
assert.deepEqual(Model.parseSavedState('native not-a-real-effect'), Model.emptyState());
assert.deepEqual(Model.parseSavedState('native constructor'), Model.emptyState());

assert.deepEqual(Model.parseStatus('device:  /dev/hidraw-test\nsaved:   -b 100 -s 3.0 prism\ndaemon:  pid 12345 (running)'), {
  device: '/dev/hidraw-test',
  saved: '-b 100 -s 3.0 prism',
  daemon: 'pid 12345 (running)'
});
assert.deepEqual(Model.parseStatus('device:  NOT FOUND\nsaved:   (nothing)\ndaemon:  not running'), {
  device: '',
  saved: '',
  daemon: 'not running'
});

assert.deepEqual(Model.effectCommand('prism', 80, 2.5, 'ff0000'), {
  command: ['kbrgb', '-b', '80', '-s', '2.5', 'prism'],
  effect: 'prism',
  brightness: 80,
  period: 2.5,
  args: []
});
assert.deepEqual(Model.effectCommand('rainbow', 50, null, 'ff0000'), {
  command: ['kbrgb', '-b', '50', 'rainbow'],
  effect: 'rainbow',
  brightness: 50,
  period: null,
  args: []
});
assert.deepEqual(Model.staticCommand('aa11ff', 65), {
  command: ['kbrgb', '-b', '65', 'aa11ff'],
  effect: 'static',
  brightness: 65,
  period: null,
  args: ['aa11ff']
});
assert.deepEqual(Model.offCommand(0), {
  command: ['kbrgb', 'off'],
  effect: 'off',
  brightness: 0,
  period: null,
  args: []
});
assert.deepEqual(Model.themeCommand(['aa11ff', 'bb22ff', 'cc33ff', 'dd44ff'], 75), {
  command: ['kbrgb', '-b', '75', 'aa11ff', 'bb22ff', 'cc33ff', 'dd44ff'],
  effect: 'theme',
  brightness: 75,
  period: null,
  args: ['aa11ff', 'bb22ff', 'cc33ff', 'dd44ff']
});
assert.deepEqual(Model.themeCommand(['aa11ff', '#bb22ff', 'cc33ff', 'dd44ff'], 100), {
  command: ['kbrgb', 'aa11ff', 'bb22ff', 'cc33ff', 'dd44ff'],
  effect: 'theme',
  brightness: 100,
  period: null,
  args: ['aa11ff', 'bb22ff', 'cc33ff', 'dd44ff']
});
assert.deepEqual(Model.themeCommand([], 75), {
  command: ['kbrgb', '-b', '75', 'theme'],
  effect: 'theme',
  brightness: 75,
  period: null,
  args: []
});
assert.deepEqual(Model.nativeCommand('meteor', 60, 4, 'ff8800'), {
  command: ['kbrgb', '-b', '60', '-s', '4', 'native', 'meteor', 'ff8800'],
  effect: 'native/meteor',
  brightness: 60,
  period: 4,
  args: ['ff8800']
});
assert.deepEqual(Model.nativeCommand('wave', 60, 4, 'ff8800'), {
  command: ['kbrgb', '-b', '60', '-s', '4', 'native', 'wave'],
  effect: 'native/wave',
  brightness: 60,
  period: 4,
  args: []
});
assert.deepEqual(Model.nativeCommandWithReverse('wave', 60, 4, 'ff8800', true), {
  command: ['kbrgb', '-r', '-b', '60', '-s', '4', 'native', 'wave'],
  effect: 'native/wave',
  brightness: 60,
  period: 4,
  reverse: true,
  args: []
});
assert.deepEqual(Model.staticCommandWithReverse('aa11ff', 65, true), {
  command: ['kbrgb', '-r', '-b', '65', 'aa11ff'],
  effect: 'static',
  brightness: 65,
  period: null,
  reverse: true,
  args: ['aa11ff']
});
assert.deepEqual(Model.effectCommandWithReverse('breathe', 70, 2, '00ff00', true), {
  command: ['kbrgb', '-r', '-b', '70', '-s', '2', 'breathe', '00ff00'],
  effect: 'breathe',
  brightness: 70,
  period: 2,
  reverse: true,
  args: ['00ff00']
});

assert.equal(Model.effectAcceptsColor('theme'), false);
assert.equal(Model.effectAcceptsColor('static'), false);
assert.equal(Model.effectAcceptsColor('off'), false);
assert.equal(Model.effectAcceptsColor('unknown-effect'), false);
assert.equal(Model.effectAcceptsColor('breathe'), true);
assert.equal(Model.effectAcceptsColor('rainbow'), false);
assert.equal(Model.effectAcceptsColor('native/wave'), false);
assert.equal(Model.effectAcceptsColor('native/meteor'), true);
assert.equal(Model.effectLabel('native/meteor'), 'Native · meteor');
assert.equal(Model.effectLabel('cpuheat'), 'cpuheat');
assert.equal(Model.effectDescription('clock'), 'Ambient hue follows time of day');
assert.equal(Model.effectDescription('unknown-effect'), '');

assert.equal(Model.filterEffects(['breathe', 'rainbow', 'wave'], 'av').join(','), 'wave');
assert.equal(Model.filterEffects(['breathe', 'rainbow', 'wave'], 'native/').length, 0);
assert.deepEqual(Model.filterEffects(['native/breathe', 'native/wave'], 'wave'), ['native/wave']);

const tokyoNightToml = [
  'mode = "dark"',
  'accent = "#7aa2f7"',
  'red = "#f7768e"',
  'green = "#9ece6a"',
  'yellow = "#e0af68"',
  'black = "#1a1b26"',
  'color4 = "#f7768e"',
  'color5 = "#e0af68"',
  'color6 = "#9ece6a"',
  'color10 = "#ffcf69"',
  'color13 = "#ffd500"'
].join('\n');
assert.deepEqual(Model.parseThemeToml(tokyoNightToml), ['7aa2f7', 'f7768e', 'e0af68', '9ece6a']);
assert.deepEqual(Model.parseThemeToml('accent = "#7aa2f7"\nred = "#111111"\n'), ['7aa2f7', '7aa2f7', '7aa2f7', '7aa2f7']);
assert.deepEqual(Model.parseThemeToml('accent = "#aaaaaa"\ncolor4 = "#aaaaaa"\n'), ['aaaaaa', 'aaaaaa', 'aaaaaa', 'aaaaaa']);
assert.deepEqual(Model.parseThemeToml('mode = "dark"\nfoo = "bar"\n'), []);
assert.deepEqual(Model.parseThemeToml('# not toml'), []);
assert.deepEqual(Model.parseThemeToml(''), []);

console.log('model.test.js: all assertions passed');

console.log('KbrgbModel tests passed');
