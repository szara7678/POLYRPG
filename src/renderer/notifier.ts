export class Notifier {
  private readonly el: HTMLDivElement;
  private timer: any = null;
  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      font: '12px/1.2 monospace',
      borderRadius: '6px',
      zIndex: '2000',
      display: 'none',
    } as CSSStyleDeclaration);
    parent.appendChild(this.el);
  }

  show(message: string, ms = 1500): void {
    this.el.textContent = message;
    this.el.style.display = 'block';
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.el.style.display = 'none'; }, ms);
  }
}


