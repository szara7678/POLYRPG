export class UIModal {
  readonly container: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly tabsBar: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly pages = new Map<string, HTMLDivElement>();
  private readonly toggleButton: HTMLButtonElement;

  constructor(parent: HTMLElement, title = 'Control Center') {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed',
      left: '50%',
      bottom: '10px',
      transform: 'translateX(-50%)',
      width: 'min(92vw, 960px)',
      background: 'rgba(20,20,28,0.88)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px',
      zIndex: '1500',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)',
      font: '12px/1.3 monospace',
    } as CSSStyleDeclaration);

    this.header = document.createElement('div');
    Object.assign(this.header.style, { padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as CSSStyleDeclaration);
    const h = document.createElement('div'); h.textContent = title; h.style.fontWeight = 'bold';
    const close = document.createElement('button'); close.textContent = '×'; close.style.cssText = 'background:none;border:none;color:#fff;font-size:16px;cursor:pointer;';
    close.onclick = () => { this.container.style.display = 'none'; };
    this.header.appendChild(h); this.header.appendChild(close);

    this.tabsBar = document.createElement('div');
    Object.assign(this.tabsBar.style, { display: 'flex', gap: '8px', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)' } as CSSStyleDeclaration);

    this.body = document.createElement('div');
    Object.assign(this.body.style, { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '10px' } as CSSStyleDeclaration);

    this.container.appendChild(this.header);
    this.container.appendChild(this.tabsBar);
    this.container.appendChild(this.body);
    parent.appendChild(this.container);

    // floating reopen button
    this.toggleButton = document.createElement('button');
    this.toggleButton.textContent = 'Menu';
    Object.assign(this.toggleButton.style, {
      position: 'fixed',
      left: '50%',
      bottom: '10px',
      transform: 'translateX(-50%)',
      padding: '8px 12px',
      background: 'rgba(20,20,28,0.9)',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '18px',
      zIndex: '1501',
      cursor: 'pointer',
      display: 'none',
    } as CSSStyleDeclaration);
    this.toggleButton.onclick = () => this.toggle();
    parent.appendChild(this.toggleButton);
  }

  addTab(id: string, title: string): HTMLDivElement {
    const btn = document.createElement('button');
    btn.textContent = title;
    btn.style.cssText = 'background:rgba(255,255,255,0.1);border:none;color:#fff;padding:6px 10px;border-radius:6px;cursor:pointer;';
    this.tabsBar.appendChild(btn);
    const page = document.createElement('div');
    page.style.display = 'none';
    this.body.appendChild(page);
    this.pages.set(id, page);
    btn.onclick = () => this.show(id);
    if (this.pages.size === 1) this.show(id);
    return page;
  }

  mount(id: string, node: HTMLElement): void {
    const page = this.pages.get(id);
    if (!page) throw new Error('Unknown tab ' + id);
    page.appendChild(node);
  }

  show(id: string): void {
    for (const [k, p] of this.pages) p.style.display = k === id ? 'block' : 'none';
  }

  toggle(): void {
    const nowHidden = this.container.style.display !== 'none' ? true : false;
    if (nowHidden) {
      this.container.style.display = 'none';
      this.toggleButton.style.display = 'block';
    } else {
      this.container.style.display = 'block';
      this.toggleButton.style.display = 'none';
    }
  }
}


