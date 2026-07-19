import type { GeneratedItemInstance, InventorySnapshot } from '../../game/loot';
import type { MerchantRuntime } from '../../game/actors';

export interface MerchantOverlayOptions {
  inventory(): readonly GeneratedItemInstance[];
  wallet(): InventorySnapshot;
  removeItem(itemId: number): GeneratedItemInstance | null;
  restoreItem(item: GeneratedItemInstance): void;
  onClose(): void;
  onChanged(): void;
}

export class MerchantOverlay {
  private readonly root = document.createElement('div');
  private tab: 'buy' | 'sell' | 'buyback' | 'services' = 'buy';

  constructor(parent: HTMLElement, private readonly runtime: MerchantRuntime, private readonly options: MerchantOverlayOptions) {
    this.root.className = 'merchant-overlay hidden';
    this.root.addEventListener('click', this.onClick);
    parent.appendChild(this.root);
  }

  open(id: string): boolean {
    if (!this.runtime.open(id)) return false;
    this.tab = 'buy';
    this.root.classList.remove('hidden');
    this.render();
    return true;
  }

  close(): void {
    this.runtime.close();
    this.root.classList.add('hidden');
    this.options.onClose();
  }

  render(): void {
    const merchant = this.runtime.active();
    if (!merchant) return;
    const wallet = this.options.wallet();
    const inventory = this.options.inventory();
    this.root.innerHTML = `
      <section class="merchant-panel">
        <header><div><span>Merchant</span><strong>${merchant.displayName}</strong></div><div><b>${wallet.copper} copper</b><button data-action="close">×</button></div></header>
        <nav>${(['buy','sell','buyback','services'] as const).map(tab => `<button data-tab="${tab}" class="${this.tab === tab ? 'active' : ''}">${tab}</button>`).join('')}</nav>
        <div class="merchant-content">
          ${this.tab === 'buy' ? '<p>Equipment stock hooks are active. Item stock will be populated by future content definitions.</p>' : ''}
          ${this.tab === 'services' ? merchant.entries.map(entry => `<article><div><strong>${entry.displayName}</strong><small>${entry.price} copper</small></div><button data-service="${entry.id}">Purchase</button></article>`).join('') || '<p>No services available.</p>' : ''}
          ${this.tab === 'sell' ? inventory.filter(item => !item.favorite).map(item => `<article><div><strong>${item.name}</strong><small>${item.rarity} · power ${item.power}</small></div><button data-sell="${item.id}">Sell ${Math.max(1, Math.floor(item.power * merchant.buybackRate))}</button></article>`).join('') || '<p>No sellable equipment.</p>' : ''}
          ${this.tab === 'buyback' ? this.runtime.buybackEntries().map((entry,index) => `<article><div><strong>${entry.item.name}</strong><small>${entry.price} copper</small></div><button data-buyback="${index}">Buy back</button></article>`).join('') || '<p>No recently sold items.</p>' : ''}
        </div>
      </section>`;
  }

  private readonly onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.action === 'close') return this.close();
    if (button.dataset.tab) { this.tab = button.dataset.tab as typeof this.tab; return this.render(); }
    if (button.dataset.service) {
      this.runtime.buyService(button.dataset.service);
      this.options.onChanged();
      return this.render();
    }
    if (button.dataset.sell) {
      const item = this.options.removeItem(Number(button.dataset.sell));
      if (item) this.runtime.sell(item);
      this.options.onChanged();
      return this.render();
    }
    if (button.dataset.buyback) {
      const entry = this.runtime.repurchase(Number(button.dataset.buyback));
      if (entry) this.options.restoreItem(entry.item);
      this.options.onChanged();
      return this.render();
    }
  };
}
