export class UIPanel {
  private readonly el: HTMLDivElement;
  constructor(parent: HTMLElement, title = 'Panel', opts?: { embedded?: boolean }) {
    this.el = document.createElement('div');
    const base: Partial<CSSStyleDeclaration> = opts?.embedded
      ? {
          position: 'relative',
          padding: '8px 10px',
          background: 'rgba(0,0,0,0.35)',
          color: '#fff',
          font: '12px/1.2 monospace',
          borderRadius: '6px',
          minWidth: '180px',
        }
      : {
          position: 'fixed',
          bottom: '8px',
          right: '8px',
          padding: '8px 10px',
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          font: '12px/1.2 monospace',
          borderRadius: '6px',
          zIndex: '1000',
          minWidth: '180px',
        };
    Object.assign(this.el.style, base as CSSStyleDeclaration);
    const h = document.createElement('div');
    h.textContent = title;
    h.style.marginBottom = '6px';
    h.style.fontWeight = 'bold';
    this.el.appendChild(h);
    parent.appendChild(this.el);
  }

  addButton(label: string, onClick: () => void): void {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.marginRight = '6px';
    btn.onclick = onClick;
    this.el.appendChild(btn);
  }

  addInput(label: string, initial: string, onChange: (value: string) => void): HTMLInputElement {
    const wrap = document.createElement('div');
    wrap.style.margin = '4px 0';
    const span = document.createElement('span');
    span.textContent = label + ': ';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = initial;
    input.style.width = '120px';
    input.onchange = () => onChange(input.value);
    wrap.appendChild(span); wrap.appendChild(input);
    this.el.appendChild(wrap);
    return input;
  }

  addNumber(label: string, initial: number, onChange: (value: number) => void, step = 1): HTMLInputElement {
    const wrap = document.createElement('div');
    wrap.style.margin = '4px 0';
    const span = document.createElement('span');
    span.textContent = label + ': ';
    const input = document.createElement('input');
    input.type = 'number';
    input.valueAsNumber = initial;
    (input as any).step = String(step);
    (input as any).style = 'width:100px';
    input.onchange = () => onChange(input.valueAsNumber);
    wrap.appendChild(span); wrap.appendChild(input);
    this.el.appendChild(wrap);
    return input as HTMLInputElement;
  }

  addRow(el: HTMLElement): void { this.el.appendChild(el); }

  setDisabled(el: HTMLButtonElement, disabled: boolean, reason?: string): void {
    el.disabled = disabled;
    el.title = disabled && reason ? reason : '';
  }

  addLabel(getText: () => string, intervalMs = 500): void {
    const span = document.createElement('span');
    span.style.display = 'inline-block';
    span.style.marginLeft = '8px';
    this.el.appendChild(span);
    const tick = () => { span.textContent = getText(); setTimeout(tick, intervalMs); };
    tick();
  }
}


