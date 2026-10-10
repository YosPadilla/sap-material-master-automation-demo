export class DemoStateMachine {
  constructor(initial = 'idle') {
    this.state = initial;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state, null, {});
    return () => this.listeners.delete(listener);
  }

  transition(next, meta = {}) {
    const previous = this.state;
    this.state = next;
    document.documentElement.dataset.demoState = next;
    window.__demoState = next;
    window.__demoHistory = window.__demoHistory || [];
    window.__demoHistory.push({ state: next, at: performance.now(), meta });
    this.listeners.forEach((listener) => listener(next, previous, meta));
  }
}
