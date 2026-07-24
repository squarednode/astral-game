import type {
  GeneratedItemInstance,
  InventorySnapshot,
} from '../../game/loot';
import type { MerchantRuntime } from '../../game/actors';

export interface MerchantStockEntry {
  item: GeneratedItemInstance;
  price: number;
}

export interface MerchantOverlayOptions {
  inventory(): readonly GeneratedItemInstance[];
  wallet(): InventorySnapshot;
  stock(merchantId: string): readonly MerchantStockEntry[];
  purchaseStock(merchantId: string, index: number): boolean;
  removeItem(itemId: number): GeneratedItemInstance | null;
  restoreItem(item: GeneratedItemInstance): boolean;
  onOpen?(): void;
  onClose(): void;
  onChanged(): void;
  feedback?(message: string, tone?: 'success' | 'warning' | 'neutral'): void;
}

export class MerchantOverlay {
  private readonly root = document.createElement('div');
  private tab: 'buy' | 'sell' | 'buyback' | 'services' = 'buy';

  constructor(
    parent: HTMLElement,
    private readonly runtime: MerchantRuntime,
    private readonly options: MerchantOverlayOptions,
  ) {
    this.root.className = 'merchant-overlay hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Merchant');
    this.root.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);
    parent.appendChild(this.root);
  }

  isOpen(): boolean { return !this.root.classList.contains('hidden'); }

  open(id: string): boolean {
    if (!this.runtime.open(id)) return false;
    this.tab = 'buy';
    this.root.classList.remove('hidden');
    this.options.onOpen?.();
    this.render();
    requestAnimationFrame(() => this.root.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
    return true;
  }

  close(): void {
    if (!this.isOpen()) return;
    this.runtime.close();
    this.root.classList.add('hidden');
    this.options.onClose();
  }

  render(): void {
    const merchant = this.runtime.active();
    if (!merchant) return;
    const wallet = this.options.wallet();
    const inventory = this.options.inventory();
    const stock = this.options.stock(merchant.id);

    this.root.innerHTML = `
      <section class="merchant-panel">
        <header>
          <div><span>Merchant</span><strong>${this.escape(merchant.displayName)}</strong></div>
          <div class="merchant-wallet">
            <b>${wallet.copper} copper</b>
            <small>${wallet.used}/${wallet.capacity} inventory</small>
            <button data-action="close" aria-label="Close merchant">×</button>
          </div>
        </header>
        <nav>
          ${(['buy', 'sell', 'buyback', 'services'] as const).map(tab =>
            `<button data-tab="${tab}" class="${this.tab === tab ? 'active' : ''}">${tab}</button>`,
          ).join('')}
        </nav>
        <div class="merchant-content">${this.content(merchant.id, merchant.buybackRate, wallet, inventory, stock)}</div>
      </section>`;
  }

  private content(
    merchantId: string,
    buybackRate: number,
    wallet: InventorySnapshot,
    inventory: readonly GeneratedItemInstance[],
    stock: readonly MerchantStockEntry[],
  ): string {
    const merchant = this.runtime.active();
    if (!merchant) return '';
    if (this.tab === 'buy') {
      return stock.length ? stock.map((entry, index) => this.itemRow(entry.item,
        `${entry.price} copper`,
        `<button data-buy-stock="${index}" ${wallet.copper < entry.price || wallet.available <= 0 ? 'disabled' : ''}>Buy</button>`)).join('')
        : '<p>No equipment currently in stock.</p>';
    }
    if (this.tab === 'sell') {
      const items = inventory.filter(item => !item.favorite);
      return items.length ? items.map(item => this.itemRow(item,
        `Sell value ${Math.max(1, Math.floor(item.power * buybackRate))} copper`,
        `<button data-sell="${item.id}">Sell</button>`)).join('')
        : '<p>No sellable equipment. Favorite items are protected.</p>';
    }
    if (this.tab === 'buyback') {
      const entries = this.runtime.buybackEntries();
      return entries.length ? entries.map((entry, index) => this.itemRow(entry.item,
        `${entry.price} copper`,
        `<button data-buyback="${index}" ${wallet.copper < entry.price || wallet.available <= 0 ? 'disabled' : ''}>Buy back</button>`)).join('')
        : '<p>No recently sold items.</p>';
    }
    return merchant.entries.map(entry => {
      const availability = this.runtime.serviceAvailability(entry.id);
      return `<article class="merchant-service">
        <div><strong>${this.escape(entry.displayName)}</strong><small>${entry.price} copper</small>${availability.passed ? '' : `<em>${this.escape(availability.reason ?? 'Unavailable')}</em>`}</div>
        <button data-service="${entry.id}" ${availability.passed ? '' : 'disabled'}>Purchase</button>
      </article>`;
    }).join('') || '<p>No services available.</p>';
  }

  private itemRow(item: GeneratedItemInstance, priceText: string, action: string): string {
    const details = [
      `${item.rarity} ${item.slot}`,
      `level ${item.itemLevel}`,
      `power ${item.power}`,
      item.affixIds.length ? `${item.affixIds.length} affix${item.affixIds.length === 1 ? '' : 'es'}` : '',
    ].filter(Boolean).join(' · ');
    const effects = item.effectDescriptions.slice(0, 2).map(effect => `<li>${this.escape(effect)}</li>`).join('');
    return `<article class="merchant-item">
      <div class="merchant-item-copy"><strong>${this.escape(item.name)}</strong><small>${this.escape(details)}</small><small>${this.escape(priceText)}</small>${effects ? `<ul>${effects}</ul>` : ''}</div>
      ${action}
    </article>`;
  }

  private readonly onClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    if (button.dataset.action === 'close') { this.close(); return; }
    if (button.dataset.tab) { this.tab = button.dataset.tab as typeof this.tab; this.render(); return; }
    const merchant = this.runtime.active();
    if (!merchant) return;

    if (button.dataset.buyStock) {
      const ok = this.options.purchaseStock(merchant.id, Number(button.dataset.buyStock));
      if (!ok) this.options.feedback?.('Purchase could not be completed.', 'warning');
      else this.options.onChanged();
      this.render();
      return;
    }
    if (button.dataset.service) {
      const ok = this.runtime.buyService(button.dataset.service);
      this.options.feedback?.(ok ? 'Service purchased.' : 'Service requirements are not met.', ok ? 'success' : 'warning');
      if (ok) this.options.onChanged();
      this.render();
      return;
    }
    if (button.dataset.sell) {
      const item = this.options.removeItem(Number(button.dataset.sell));
      if (item) {
        const price = this.runtime.sell(item);
        this.options.feedback?.(`Sold ${item.name} for ${price} copper.`, 'success');
        this.options.onChanged();
      }
      this.render();
      return;
    }
    if (button.dataset.buyback) {
      const ok = this.runtime.repurchase(Number(button.dataset.buyback), item => this.options.restoreItem(item));
      this.options.feedback?.(ok ? 'Item restored from buyback.' : 'Buyback failed. No copper or item was lost.', ok ? 'success' : 'warning');
      if (ok) this.options.onChanged();
      this.render();
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isOpen()) { event.preventDefault(); this.close(); }
  };

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!);
  }
}
