// Input unificado: mouse, toque e teclado viram um único "segurando".
// Toque sem delay (pointer events + touch-action: none) e sem zoom/scroll acidental.

const HOLD_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);

export class Input {
  constructor() {
    this.pointers = new Set();
    this.keys = new Set();
    this.handlers = { press: [], pause: [], mute: [], confirm: [] };

    const isUi = (e) => e.target instanceof Element && e.target.closest('button, a, input, label, .ui-block');

    window.addEventListener('pointerdown', (e) => {
      if (isUi(e)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const wasHolding = this.holding;
      this.pointers.add(e.pointerId);
      if (!wasHolding) this.emit('press');
    }, { passive: false });

    const up = (e) => this.pointers.delete(e.pointerId);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', () => { this.pointers.clear(); this.keys.clear(); });

    // Evita menu de contexto no toque longo, seleção e zoom por gesto.
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', (e) => { if (!isUi(e)) e.preventDefault(); }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (HOLD_KEYS.has(e.code)) {
        e.preventDefault();
        // Se um botão estiver focado, o espaço não deve "clicar" nele.
        if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
        if (e.repeat) return;
        const wasHolding = this.holding;
        this.keys.add(e.code);
        if (!wasHolding) this.emit('press');
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        if (!e.repeat) this.emit('pause');
      } else if (e.code === 'KeyM') {
        if (!e.repeat) this.emit('mute');
      } else if (e.code === 'Enter') {
        if (!(document.activeElement instanceof HTMLButtonElement) && !e.repeat) this.emit('confirm');
      }
    });
    window.addEventListener('keyup', (e) => { if (HOLD_KEYS.has(e.code)) this.keys.delete(e.code); });
  }

  get holding() { return this.pointers.size > 0 || this.keys.size > 0; }
  on(name, fn) { this.handlers[name].push(fn); }
  emit(name) { for (const fn of this.handlers[name]) fn(); }
  release() { this.pointers.clear(); this.keys.clear(); }
}
