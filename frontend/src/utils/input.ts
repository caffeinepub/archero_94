import type { InputState } from "./types";
import { JOYSTICK_DEAD_ZONE } from "./constants";

export function createInputState(): InputState {
  return {
    joystickActive: false,
    joystickDirection: { x: 0, y: 0 },
    joystickMagnitude: 0,
  };
}

// Keyboard input
const keysDown = new Set<string>();

export function setupKeyboardInput(input: InputState): () => void {
  function onKeyDown(e: KeyboardEvent) {
    keysDown.add(e.key.toLowerCase());
    updateKeyboardDirection(input);
  }

  function onKeyUp(e: KeyboardEvent) {
    keysDown.delete(e.key.toLowerCase());
    updateKeyboardDirection(input);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    keysDown.clear();
  };
}

function updateKeyboardDirection(input: InputState) {
  let dx = 0;
  let dy = 0;

  if (keysDown.has("w") || keysDown.has("arrowup")) dy -= 1;
  if (keysDown.has("s") || keysDown.has("arrowdown")) dy += 1;
  if (keysDown.has("a") || keysDown.has("arrowleft")) dx -= 1;
  if (keysDown.has("d") || keysDown.has("arrowright")) dx += 1;

  const magnitude = Math.sqrt(dx * dx + dy * dy);
  if (magnitude > 0) {
    input.joystickActive = true;
    input.joystickDirection.x = dx / magnitude;
    input.joystickDirection.y = dy / magnitude;
    input.joystickMagnitude = 1;
  } else {
    input.joystickActive = false;
    input.joystickDirection.x = 0;
    input.joystickDirection.y = 0;
    input.joystickMagnitude = 0;
  }
}

// Touch joystick input
export interface JoystickState {
  active: boolean;
  centerX: number;
  centerY: number;
  knobX: number;
  knobY: number;
  touchId: number | null;
}

export function createJoystickState(): JoystickState {
  return {
    active: false,
    centerX: 0,
    centerY: 0,
    knobX: 0,
    knobY: 0,
    touchId: null,
  };
}

export function setupTouchInput(
  input: InputState,
  joystick: JoystickState,
  canvas: HTMLCanvasElement,
  joystickRadius: number,
): () => void {
  function onTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (joystick.active) return;

    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Only activate on the bottom 60% of screen (joystick area)
    if (y < rect.height * 0.4) return;

    joystick.active = true;
    joystick.touchId = touch.identifier;
    joystick.centerX = x;
    joystick.centerY = y;
    joystick.knobX = x;
    joystick.knobY = y;
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!joystick.active || joystick.touchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== joystick.touchId) continue;

      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      let dx = x - joystick.centerX;
      let dy = y - joystick.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Clamp to joystick radius
      if (dist > joystickRadius) {
        dx = (dx / dist) * joystickRadius;
        dy = (dy / dist) * joystickRadius;
      }

      joystick.knobX = joystick.centerX + dx;
      joystick.knobY = joystick.centerY + dy;

      const normalizedDist = Math.min(dist / joystickRadius, 1);

      if (normalizedDist > JOYSTICK_DEAD_ZONE) {
        input.joystickActive = true;
        // Normalize direction from clamped dx/dy
        const clampedDist = Math.sqrt(dx * dx + dy * dy);
        input.joystickDirection.x = clampedDist > 0 ? dx / clampedDist : 0;
        input.joystickDirection.y = clampedDist > 0 ? dy / clampedDist : 0;
        input.joystickMagnitude = normalizedDist;
      } else {
        input.joystickActive = false;
        input.joystickDirection.x = 0;
        input.joystickDirection.y = 0;
        input.joystickMagnitude = 0;
      }
    }
  }

  function onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystick.touchId) {
        joystick.active = false;
        joystick.touchId = null;
        input.joystickActive = false;
        input.joystickDirection.x = 0;
        input.joystickDirection.y = 0;
        input.joystickMagnitude = 0;
      }
    }
  }

  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

  return () => {
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
    canvas.removeEventListener("touchcancel", onTouchEnd);
  };
}

// Mouse joystick input (for desktop)
export function setupMouseInput(
  input: InputState,
  joystick: JoystickState,
  canvas: HTMLCanvasElement,
  joystickRadius: number,
): () => void {
  function onMouseDown(e: MouseEvent) {
    if (joystick.active) return;
    if (e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (y < rect.height * 0.4) return;

    joystick.active = true;
    joystick.touchId = -1;
    joystick.centerX = x;
    joystick.centerY = y;
    joystick.knobX = x;
    joystick.knobY = y;
  }

  function onMouseMove(e: MouseEvent) {
    if (!joystick.active) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let dx = x - joystick.centerX;
    let dy = y - joystick.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > joystickRadius) {
      dx = (dx / dist) * joystickRadius;
      dy = (dy / dist) * joystickRadius;
    }

    joystick.knobX = joystick.centerX + dx;
    joystick.knobY = joystick.centerY + dy;

    const normalizedDist = Math.min(dist / joystickRadius, 1);

    if (normalizedDist > JOYSTICK_DEAD_ZONE) {
      input.joystickActive = true;
      const clampedDist = Math.sqrt(dx * dx + dy * dy);
      input.joystickDirection.x = clampedDist > 0 ? dx / clampedDist : 0;
      input.joystickDirection.y = clampedDist > 0 ? dy / clampedDist : 0;
      input.joystickMagnitude = normalizedDist;
    } else {
      input.joystickActive = false;
      input.joystickDirection.x = 0;
      input.joystickDirection.y = 0;
      input.joystickMagnitude = 0;
    }
  }

  function onMouseUp() {
    if (!joystick.active) return;
    joystick.active = false;
    joystick.touchId = null;
    input.joystickActive = false;
    input.joystickDirection.x = 0;
    input.joystickDirection.y = 0;
    input.joystickMagnitude = 0;
  }

  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  return () => {
    canvas.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };
}
