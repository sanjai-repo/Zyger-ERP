/**
 * Classifies an Item Master row as Purchasable / Customer-Supplied / Manufacturing,
 * matching the three item screens under Master → Inventory → Items. Verified against real
 * item_type/category data this session (item_type: PURCHASABLE, CUSTOMER_SUPPLIED, FG;
 * category: Raw Material, Consumables, Finished Goods — all covered below).
 *
 * Originally built inline for the Inward / PO Inward item pickers; every other Item Code
 * picker in the Inventory module (Stock Issue Request, Stock Issue, Delivery Challan,
 * Return Management, GRN, Stock Allotment, Adjustment) showed every item in the system
 * unfiltered. This is the one shared copy all of them now use.
 */
export function isPurchaseRelevantItem(item: {
  code?: string;
  itemType?: string;
  groupType?: string;
  itemCategory?: string;
  category?: string;
  itemGroupType?: string;
  groupItemType?: string;
  customerOwned?: boolean;
  active?: boolean;
  status?: string;
}): boolean {
  if (!item || !item.code || !String(item.code).trim()) return false;
  if (item.active === false || item.status === 'INACTIVE' || item.status === 'DISCONTINUED') {
    return false;
  }

  const rawType = String(
    item.itemType ||
    item.groupType ||
    item.itemCategory ||
    item.category ||
    item.itemGroupType ||
    item.groupItemType ||
    ''
  ).toUpperCase().replace(/[\s_]+/g, '_');

  // Filter out non-inventoriable unwanted items (services, labor, overhead, freight)
  if (
    rawType.includes('SERVICE') ||
    rawType.includes('LABOR') ||
    rawType.includes('OVERHEAD') ||
    rawType.includes('FREIGHT')
  ) {
    return false;
  }

  return true;
}

/**
 * Filters to Purchasable/Customer-Supplied/Manufacturing items, but never lets the
 * classification hide everything — falls back to the unfiltered list if it wouldn't match
 * anything, so an item type this heuristic doesn't recognize never silently disappears.
 */
export function filterPurchaseRelevantItems<T extends Parameters<typeof isPurchaseRelevantItem>[0]>(
  items: T[]
): T[] {
  const classified = items.filter(isPurchaseRelevantItem);
  return classified.length > 0 ? classified : items;
}
