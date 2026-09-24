const STATIC_EFFECT_NAMES = [
  "static",
  "theme",
  "off"
];

const EFFECT_DESCRIPTIONS = {
  "breathe": "Fade in and out",
  "rainbow": "Cycle the color wheel",
  "wave": "Moving rainbow across zones",
  "snake": "Scanner with a fading tail",
  "meteor": "Comet sweep with wraparound",
  "police": "Alternating red and blue strobe",
  "sparkle": "Random zones twinkle",
  "fire": "Flickering embers",
  "heartbeat": "Double-pulse rhythm",
  "aurora": "Slow northern-lights drift",
  "ocean": "Rolling blue swells",
  "lava": "Slow oozing magma",
  "matrix": "Green digital rain",
  "candle": "Warm candle flicker",
  "storm": "Dark sky with lightning",
  "disco": "Random zones and colors",
  "duel": "Two bouncing comets",
  "shadow": "Lit field with roaming gap",
  "ripple": "Breathing flow across zones",
  "chase": "Hard one-zone marquee",
  "strobe": "Fast party strobe",
  "cpuheat": "Color follows CPU temperature",
  "battery": "Four-zone battery bar",
  "typewriter": "Keys make the board glow",
  "keyflash": "Each key flashes its zone",
  "wpmheat": "Color follows typing speed",
  "zen": "Fades while you are idle",
  "flow": "Typing heat with idle sleep",
  "load": "CPU and GPU load meter",
  "clock": "Ambient hue follows time of day",
  "netpulse": "Network upload and download meter",
  "pomo": "Pomodoro timer",
  "prism": "Flowing ripple with shifting hue",
  "glitch": "Stable color with glitch bursts",
  "eruption": "Smoldering volcano eruptions",
  "redalert": "Klaxon alarm sweep",
  "supernova": "Charge, explosion, fading embers",
  "shockwave": "Bright front slams across",
  "native/breathe": "Hardware breathing effect",
  "native/neon": "Hardware neon effect",
  "native/wave": "Hardware wave effect",
  "native/zoom": "Hardware zoom effect",
  "native/meteor": "Hardware meteor effect",
  "native/twinkle": "Hardware twinkle effect"
};

const NATIVE_EFFECTS = {
  "native/breathe": true,
  "native/neon": false,
  "native/wave": false,
  "native/zoom": false,
  "native/meteor": true,
  "native/twinkle": true
};

const EFFECT_COLOR_LIMITS = {
  "breathe": 1,
  "rainbow": 0,
  "wave": 0,
  "snake": 1,
  "meteor": 1,
  "police": 2,
  "sparkle": 4,
  "fire": 0,
  "heartbeat": 1,
  "aurora": 0,
  "ocean": 0,
  "lava": 0,
  "matrix": 0,
  "candle": 0,
  "storm": 0,
  "disco": 0,
  "duel": 2,
  "shadow": 1,
  "ripple": 1,
  "chase": 1,
  "strobe": 1,
  "cpuheat": 0,
  "battery": 0,
  "typewriter": 1,
  "keyflash": 1,
  "wpmheat": 1,
  "zen": 1,
  "flow": 0,
  "load": 0,
  "clock": 0,
  "netpulse": 0,
  "pomo": 0,
  "prism": 0,
  "glitch": 1,
  "eruption": 0,
  "redalert": 1,
  "supernova": 0,
  "shockwave": 1
};

const EFFECT_NAMES = Object.keys(EFFECT_COLOR_LIMITS);

const THEME_ACCENT_ORDER = [
  "accent", "color4", "color1", "color5", "color2", "color3",
  "color6", "color9", "color10", "color11", "color12", "color13"
];

// Mirrors kbrgb-theme's colors.toml resolution (theme_colors) so the panel can
// paint zone colors itself instead of depending on kbrgb's own theme lookup,
// which targets a stale Omarchy path.
function isColorfulHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return Math.max(rgb.red, rgb.green, rgb.blue) - Math.min(rgb.red, rgb.green, rgb.blue) >= 40;
}

function parseThemeToml(text) {
  const raw = {};
  String(text || "").split(/\r?\n/).forEach(function(line) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*"?#?([0-9A-Fa-f]{6})"?\s*$/);
    if (match) raw[match[1]] = match[2];
  });
  const ordered = [];
  THEME_ACCENT_ORDER.forEach(function(key) {
    const value = normalizeHex(raw[key]);
    if (value && ordered.indexOf(value) === -1) ordered.push(value);
  });
  const found = [];
  ordered.forEach(function(hex) {
    if (isColorfulHex(hex) && found.indexOf(hex) === -1) found.push(hex);
  });
  ordered.forEach(function(hex) {
    if (found.indexOf(hex) === -1) found.push(hex);
  });
  if (found.length === 0) return [];
  while (found.length < 4) found.push(found[found.length - 1]);
  return found.slice(0, 4);
}

function clamp(value, minimum, maximum) {
  const number = Number(value);
  if (!isFinite(number)) return minimum;
  return Math.max(minimum, Math.min(maximum, number));
}

function normalizeHex(raw) {
  const value = String(raw || "").trim().replace(/^#/, "");
  return /^[0-9A-Fa-f]{6}$/.test(value) ? value.toLowerCase() : "";
}

function hexToRgb(raw) {
  const value = normalizeHex(raw);
  if (!value) return null;
  return {
    red: parseInt(value.substring(0, 2), 16),
    green: parseInt(value.substring(2, 4), 16),
    blue: parseInt(value.substring(4, 6), 16)
  };
}

function componentHex(value) {
  return clamp(Math.round(Number(value) || 0), 0, 255).toString(16).padStart(2, "0");
}

function rgbToHex(rgb) {
  if (!rgb) return "";
  return componentHex(rgb.red) + componentHex(rgb.green) + componentHex(rgb.blue);
}

function hsvToRgb(hsv) {
  const h = ((Number(hsv && hsv.h) || 0) % 1 + 1) % 1;
  const s = clamp(hsv && hsv.s, 0, 1);
  const v = clamp(hsv && hsv.v, 0, 1);
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  if (i === 0) { r = v; g = t; b = p; }
  else if (i === 1) { r = q; g = v; b = p; }
  else if (i === 2) { r = p; g = v; b = t; }
  else if (i === 3) { r = p; g = q; b = v; }
  else if (i === 4) { r = t; g = p; b = v; }
  else { r = v; g = p; b = q; }
  return {
    red: Math.round(r * 255),
    green: Math.round(g * 255),
    blue: Math.round(b * 255)
  };
}

function hsvToHex(hsv) {
  return rgbToHex(hsvToRgb(hsv));
}

function emptyState() {
  return {
    brightness: 100,
    period: null,
    effect: "theme",
    reverse: false,
    args: []
  };
}

function parseSavedState(raw) {
  const text = String(raw || "").trim();
  if (!text || text === "(nothing)") return emptyState();

  const tokens = text.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  let brightness = 100;
  let period = null;
  let reverse = false;
  const words = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].replace(/^"|"$/g, "");
    if (token === "-b" && i + 1 < tokens.length) {
      const number = Number(tokens[++i]);
      if (isFinite(number)) brightness = clamp(number, 0, 100);
    } else if (token === "-s" && i + 1 < tokens.length) {
      const number = Number(tokens[++i]);
      if (isFinite(number)) period = number;
    } else if (token === "-r") {
      reverse = true;
    } else {
      words.push(token);
    }
  }

  if (!words.length) return emptyState();
  if (words[0] === "native" && words[1]) {
    const nativeName = words[1];
    if (!Object.prototype.hasOwnProperty.call(NATIVE_EFFECTS, "native/" + nativeName)) return emptyState();
    return {
      brightness,
      period,
      effect: "native/" + nativeName,
      reverse,
      args: words.slice(2)
    };
  }
  if (words[0] === "off" || words[0] === "theme" || words[0] === "static") {
    return { brightness, period, effect: words[0], reverse, args: words.slice(1) };
  }
  if (normalizeHex(words[0])) {
    return { brightness, period, effect: "static", reverse, args: words };
  }
  const knownEffect = Object.prototype.hasOwnProperty.call(EFFECT_COLOR_LIMITS, words[0])
    || (words[0].indexOf("native/") === 0 && Object.prototype.hasOwnProperty.call(NATIVE_EFFECTS, words[0]));
  if (knownEffect) {
    return { brightness, period, effect: words[0], reverse, args: words.slice(1) };
  }
  return emptyState();
}

function parseStatus(raw) {
  const text = String(raw || "");
  const lines = text.split(/\r?\n/);
  const result = { device: "", saved: "", daemon: "not running" };
  for (const line of lines) {
    const match = line.match(/^(device|saved|daemon):\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim();
    if (key === "device") result.device = value === "NOT FOUND" ? "" : value;
    if (key === "saved") result.saved = value === "(nothing)" ? "" : value;
    if (key === "daemon") result.daemon = value;
  }
  return result;
}

function commonCommand(effect, brightness, period, args, native) {
  const command = ["kbrgb"];
  if (Number(brightness) !== 100) command.push("-b", String(Math.round(clamp(brightness, 0, 100))));
  if (period !== null && period !== undefined && isFinite(Number(period))) {
    command.push("-s", String(Number(period)));
  }
  if (native) {
    command.push("native", effect.replace(/^native\//, ""));
  } else {
    command.push(effect);
  }
  for (const arg of args || []) {
    const color = normalizeHex(arg);
    if (color) command.push(color);
  }
  return command;
}

function commonCommandWithReverse(effect, brightness, period, args, native, reverse) {
  const command = ["kbrgb"];
  if (reverse) command.push("-r");
  if (Number(brightness) !== 100) command.push("-b", String(Math.round(clamp(brightness, 0, 100))));
  if (period !== null && period !== undefined && isFinite(Number(period))) {
    command.push("-s", String(Number(period)));
  }
  if (native) {
    command.push("native", effect.replace(/^native\//, ""));
  } else {
    command.push(effect);
  }
  for (const arg of args || []) {
    const color = normalizeHex(arg);
    if (color) command.push(color);
  }
  return command;
}

function makeRequest(effect, brightness, period, args, native) {
  return {
    command: commonCommand(effect, brightness, period, args, native),
    effect,
    brightness: clamp(brightness, 0, 100),
    period: period === null || period === undefined || !isFinite(Number(period)) ? null : Number(period),
    args: (args || []).map(normalizeHex).filter(Boolean)
  };
}

function makeRequestWithReverse(effect, brightness, period, args, native, reverse) {
  return {
    command: commonCommandWithReverse(effect, brightness, period, args, native, reverse),
    effect,
    brightness: clamp(brightness, 0, 100),
    period: period === null || period === undefined || !isFinite(Number(period)) ? null : Number(period),
    reverse: !!reverse,
    args: (args || []).map(normalizeHex).filter(Boolean)
  };
}

function effectCommand(effect, brightness, period, color) {
  const acceptsColor = effectAcceptsColor(effect);
  const args = acceptsColor && color ? [color] : [];
  return makeRequest(effect, brightness, period, args, false);
}

function staticCommand(color, brightness) {
  const normalized = normalizeHex(color) || "aa11ff";
  const command = ["kbrgb"];
  if (Number(brightness) !== 100) command.push("-b", String(Math.round(clamp(brightness, 0, 100))));
  command.push(normalized);
  return {
    command,
    effect: "static",
    brightness: clamp(brightness, 0, 100),
    period: null,
    args: [normalized]
  };
}

function effectCommandWithReverse(effect, brightness, period, color, reverse) {
  const acceptsColor = effectAcceptsColor(effect);
  const args = acceptsColor && color ? [color] : [];
  return makeRequestWithReverse(effect, brightness, period, args, false, reverse);
}

function staticCommandWithReverse(color, brightness, reverse) {
  const normalized = normalizeHex(color) || "aa11ff";
  const command = ["kbrgb"];
  if (reverse) command.push("-r");
  if (Number(brightness) !== 100) command.push("-b", String(Math.round(clamp(brightness, 0, 100))));
  command.push(normalized);
  return {
    command,
    effect: "static",
    brightness: clamp(brightness, 0, 100),
    period: null,
    reverse: !!reverse,
    args: [normalized]
  };
}

function offCommand() {
  return { command: ["kbrgb", "off"], effect: "off", brightness: 0, period: null, args: [] };
}

function themeCommand(colors, brightness) {
  const normalized = (colors || []).map(normalizeHex).filter(Boolean);
  if (normalized.length === 4) {
    const command = ["kbrgb"];
    if (Number(brightness) !== 100) command.push("-b", String(Math.round(clamp(brightness, 0, 100))));
    return {
      command: command.concat(normalized),
      effect: "theme",
      brightness: clamp(brightness, 0, 100),
      period: null,
      args: normalized
    };
  }
  return makeRequest("theme", brightness, null, [], false);
}

function nativeCommand(effect, brightness, speed, color) {
  const name = String(effect || "").replace(/^native\//, "");
  const args = NATIVE_EFFECTS["native/" + name] && color ? [color] : [];
  return makeRequest("native/" + name, brightness, speed, args, true);
}

function nativeCommandWithReverse(effect, brightness, speed, color, reverse) {
  const name = String(effect || "").replace(/^native\//, "");
  const args = NATIVE_EFFECTS["native/" + name] && color ? [color] : [];
  return makeRequestWithReverse("native/" + name, brightness, speed, args, true, reverse);
}

function effectAcceptsColor(effect) {
  if (Object.prototype.hasOwnProperty.call(NATIVE_EFFECTS, effect)) return NATIVE_EFFECTS[effect];
  return Object.prototype.hasOwnProperty.call(EFFECT_COLOR_LIMITS, effect)
    && EFFECT_COLOR_LIMITS[effect] > 0;
}

function effectDescription(effect) {
  return EFFECT_DESCRIPTIONS[effect] || "";
}

function effectLabel(effect) {
  if (String(effect).indexOf("native/") === 0) return "Native · " + String(effect).slice(7);
  return String(effect);
}

function filterEffects(effects, query) {
  const value = String(query || "").trim().toLowerCase();
  if (!value) return effects.slice();
  return effects.filter(function(effect) {
    return effect.toLowerCase().indexOf(value) !== -1 || effectDescription(effect).toLowerCase().indexOf(value) !== -1;
  });
}

const api = {
  STATIC_EFFECT_NAMES,
  EFFECT_DESCRIPTIONS,
  NATIVE_EFFECTS,
  EFFECT_COLOR_LIMITS,
  clamp,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  hsvToRgb,
  hsvToHex,
  emptyState,
  parseSavedState,
  parseStatus,
  parseThemeToml,
  effectCommand,
  effectCommandWithReverse,
  staticCommand,
  staticCommandWithReverse,
  offCommand,
  themeCommand,
  nativeCommand,
  nativeCommandWithReverse,
  effectAcceptsColor,
  effectDescription,
  effectLabel,
  filterEffects
};

if (typeof module !== "undefined") module.exports = api;
if (typeof globalThis !== "undefined") globalThis.KbrgbModel = api;
