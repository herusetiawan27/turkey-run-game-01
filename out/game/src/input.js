// Keyboard and pointer input. The game reads two things each step: whether a
// jump was pressed since the last step (edge-triggered, so a mid-air press can
// spend the turkey's wing-flap) and whether duck is currently held.

export class Input {
  constructor(canvas) {
    this.jumpQueued = false;
    this.duckHeld = false;
    this.anyKey = false;
    this.keys = new Set();

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.anyKey = true;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.jumpQueued = true;
        e.preventDefault();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.duckHeld = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.duckHeld = false;
    });
    canvas.addEventListener('pointerdown', () => {
      this.anyKey = true;
      this.jumpQueued = true;
    });
  }

  /** Read and clear the queued jump press. */
  takeJump() {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  pressed(code) {
    return this.keys.has(code);
  }
}
