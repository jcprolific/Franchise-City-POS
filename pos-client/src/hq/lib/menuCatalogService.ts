import { supabase } from '../../lib/supabase';
import type {
  Addon,
  Category,
  Product,
  ProductVariant,
  RawMaterial,
  RecipeLine,
} from '../../types';

export interface CatalogBundle {
  categories: Category[];
  products: Product[];
  variants: ProductVariant[];
  addons: Addon[];
  productAddons: { product_id: string; addon_id: string }[];
}

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

interface ProductRow {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number | string | null;
  icon: string | null;
  image_url: string | null;
  badge: string | null;
  customizable: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface VariantRow {
  id: string;
  product_id: string;
  name: string;
  abbr: string;
  additional_price: number | string | null;
  sort_order: number | null;
}

interface AddonRow {
  id: string;
  name: string;
  price: number | string | null;
  is_active: boolean | null;
}

interface RawMaterialRow {
  id: string;
  brand_id: string;
  name: string;
  unit: string;
  on_hand_qty: number | string | null;
  low_stock_qty: number | string | null;
  icon: string | null;
}

interface RecipeRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  raw_material_id: string;
  quantity_per_cup: number | string | null;
  unit: string;
  yield_notes: string | null;
}

function toNum(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

/**
 * Fetch the full brand-scoped catalog. Returns null when the catalog tables
 * are missing or empty so callers can fall back to the static brand menu.
 */
export async function fetchMenuCatalog(brandDbId: string): Promise<CatalogBundle | null> {
  const [categoryRes, productRes, addonRes] = await Promise.all([
    supabase
      .from('menu_category')
      .select('id,name,icon,sort_order,is_active')
      .eq('brand_id', brandDbId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('menu_product')
      .select('id,category_id,name,description,base_price,icon,image_url,badge,customizable,is_active,sort_order')
      .eq('brand_id', brandDbId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('menu_addon')
      .select('id,name,price,is_active')
      .eq('brand_id', brandDbId)
      .order('name', { ascending: true }),
  ]);

  if (categoryRes.error || productRes.error || addonRes.error) {
    return null;
  }

  const categoryRows = (categoryRes.data as CategoryRow[] | null) ?? [];
  const productRows = (productRes.data as ProductRow[] | null) ?? [];
  const addonRows = (addonRes.data as AddonRow[] | null) ?? [];

  if (categoryRows.length === 0 && productRows.length === 0) {
    return null;
  }

  const productIds = productRows.map((p) => p.id);

  const [variantRes, productAddonRes] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from('menu_product_variant')
          .select('id,product_id,name,abbr,additional_price,sort_order')
          .in('product_id', productIds)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    productIds.length > 0
      ? supabase
          .from('menu_product_addon')
          .select('product_id,addon_id')
          .in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const variantRows = (variantRes.data as VariantRow[] | null) ?? [];
  const productAddonRows =
    (productAddonRes.data as { product_id: string; addon_id: string }[] | null) ?? [];

  const categories: Category[] = categoryRows
    .filter((c) => c.is_active !== false)
    .map((c) => ({
      id: c.id,
      name: c.name,
      sort_order: c.sort_order ?? 0,
      icon: c.icon ?? '',
    }));

  const products: Product[] = productRows.map((p) => ({
    id: p.id,
    category_id: p.category_id ?? '',
    name: p.name,
    base_price: toNum(p.base_price),
    is_active: p.is_active !== false,
    image_url: p.image_url,
    icon: p.icon ?? '',
    description: p.description ?? undefined,
    badge: p.badge ?? undefined,
    customizable: p.customizable === true,
  }));

  const variants: ProductVariant[] = variantRows.map((v) => ({
    id: v.id,
    product_id: v.product_id,
    name: v.name,
    abbr: v.abbr,
    additional_price: toNum(v.additional_price),
  }));

  const addons: Addon[] = addonRows.map((a) => ({
    id: a.id,
    name: a.name,
    price: toNum(a.price),
    is_active: a.is_active !== false,
  }));

  return { categories, products, variants, addons, productAddons: productAddonRows };
}

/** Use HQ catalog only when it is at least as complete as the bundled static menu. */
export function shouldPreferRemoteCatalog(
  staticProducts: Product[],
  remote: CatalogBundle | null
): boolean {
  if (!remote || remote.products.length === 0) return false;
  const staticActive = staticProducts.filter((p) => p.is_active).length;
  const remoteActive = remote.products.filter((p) => p.is_active).length;
  return remoteActive >= staticActive;
}

export async function fetchRawMaterials(brandDbId: string): Promise<RawMaterial[]> {
  const { data, error } = await supabase
    .from('raw_material')
    .select('id,brand_id,name,unit,on_hand_qty,low_stock_qty,icon')
    .eq('brand_id', brandDbId)
    .order('name', { ascending: true });

  if (error) return [];
  return ((data as RawMaterialRow[] | null) ?? []).map((m) => ({
    id: m.id,
    brand_id: m.brand_id,
    name: m.name,
    unit: m.unit,
    on_hand_qty: toNum(m.on_hand_qty),
    low_stock_qty: toNum(m.low_stock_qty),
    icon: m.icon,
  }));
}

export async function fetchRecipes(brandDbId: string): Promise<RecipeLine[]> {
  // Recipes join through products to scope by brand.
  const productRes = await supabase
    .from('menu_product')
    .select('id')
    .eq('brand_id', brandDbId);

  if (productRes.error) return [];
  const productIds = ((productRes.data as { id: string }[] | null) ?? []).map((p) => p.id);
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from('menu_recipe')
    .select('id,product_id,variant_id,raw_material_id,quantity_per_cup,unit,yield_notes')
    .in('product_id', productIds);

  if (error) return [];
  return ((data as RecipeRow[] | null) ?? []).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    variant_id: r.variant_id,
    raw_material_id: r.raw_material_id,
    quantity_per_cup: toNum(r.quantity_per_cup),
    unit: r.unit,
    yield_notes: r.yield_notes,
  }));
}

// ============================================================
// Mutations (HQ catalog editing)
// ============================================================

export interface ProductInput {
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  icon: string;
  customizable: boolean;
  is_active: boolean;
}

export async function createProduct(brandDbId: string, input: ProductInput) {
  return supabase.from('menu_product').insert({
    brand_id: brandDbId,
    category_id: input.category_id || null,
    name: input.name,
    description: input.description,
    base_price: input.base_price,
    icon: input.icon,
    customizable: input.customizable,
    is_active: input.is_active,
  });
}

export async function updateProduct(productId: string, input: Partial<ProductInput>) {
  const patch: Record<string, unknown> = {};
  if (input.category_id !== undefined) patch.category_id = input.category_id || null;
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.base_price !== undefined) patch.base_price = input.base_price;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.customizable !== undefined) patch.customizable = input.customizable;
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  return supabase.from('menu_product').update(patch).eq('id', productId);
}

export async function setProductActive(productId: string, isActive: boolean) {
  return supabase.from('menu_product').update({ is_active: isActive }).eq('id', productId);
}

export async function createCategory(
  brandDbId: string,
  input: { name: string; icon: string; sort_order: number }
) {
  return supabase.from('menu_category').insert({
    brand_id: brandDbId,
    name: input.name,
    icon: input.icon,
    sort_order: input.sort_order,
  });
}

export async function createVariant(
  productId: string,
  input: { name: string; abbr: string; additional_price: number; sort_order: number }
) {
  return supabase.from('menu_product_variant').insert({
    product_id: productId,
    name: input.name,
    abbr: input.abbr,
    additional_price: input.additional_price,
    sort_order: input.sort_order,
  });
}

export async function deleteVariant(variantId: string) {
  return supabase.from('menu_product_variant').delete().eq('id', variantId);
}

export async function createAddon(
  brandDbId: string,
  input: { name: string; price: number }
) {
  return supabase.from('menu_addon').insert({
    brand_id: brandDbId,
    name: input.name,
    price: input.price,
  });
}

export async function upsertRawMaterial(
  brandDbId: string,
  input: { id?: string; name: string; unit: string; on_hand_qty: number; low_stock_qty: number; icon: string }
) {
  if (input.id) {
    return supabase
      .from('raw_material')
      .update({
        name: input.name,
        unit: input.unit,
        on_hand_qty: input.on_hand_qty,
        low_stock_qty: input.low_stock_qty,
        icon: input.icon,
      })
      .eq('id', input.id);
  }
  return supabase.from('raw_material').insert({
    brand_id: brandDbId,
    name: input.name,
    unit: input.unit,
    on_hand_qty: input.on_hand_qty,
    low_stock_qty: input.low_stock_qty,
    icon: input.icon,
  });
}

export async function createRecipeLine(input: {
  product_id: string;
  raw_material_id: string;
  quantity_per_cup: number;
  unit: string;
  yield_notes?: string;
}) {
  return supabase.from('menu_recipe').insert({
    product_id: input.product_id,
    raw_material_id: input.raw_material_id,
    quantity_per_cup: input.quantity_per_cup,
    unit: input.unit,
    yield_notes: input.yield_notes ?? null,
  });
}

export async function deleteRecipeLine(recipeId: string) {
  return supabase.from('menu_recipe').delete().eq('id', recipeId);
}

// Yield computation helpers for HQ catalog planning visibility.

/** Estimated cups producible from one material's on-hand qty given per-cup usage. */
export function computeMaterialYield(onHand: number, perCup: number): number {
  if (perCup <= 0) return 0;
  return Math.floor(onHand / perCup);
}

/**
 * Estimated cups for a product = the limiting (minimum) yield across all of its
 * recipe materials. Returns null when the product has no recipe lines.
 */
export function computeProductYield(
  recipesForProduct: RecipeLine[],
  materialsById: Map<string, RawMaterial>
): number | null {
  if (recipesForProduct.length === 0) return null;
  let limiting = Infinity;
  for (const line of recipesForProduct) {
    const material = materialsById.get(line.raw_material_id);
    if (!material) continue;
    const cups = computeMaterialYield(material.on_hand_qty, line.quantity_per_cup);
    if (cups < limiting) limiting = cups;
  }
  return limiting === Infinity ? null : limiting;
}
