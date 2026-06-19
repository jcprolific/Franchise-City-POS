import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import type {
  Addon,
  Category,
  Product,
  ProductVariant,
  RawMaterial,
  RecipeLine,
} from '../../types';
import {
  computeMaterialYield,
  computeProductYield,
  createAddon,
  createProduct,
  createRecipeLine,
  createVariant,
  deleteRecipeLine,
  deleteVariant,
  fetchMenuCatalog,
  fetchRawMaterials,
  fetchRecipes,
  setProductActive,
  upsertRawMaterial,
  type CatalogBundle,
} from '../lib/menuCatalogService';
import './MenuCatalogPage.css';

const emptyProductForm = {
  name: '',
  category_id: '',
  description: '',
  base_price: '',
  icon: '🧋',
  customizable: true,
};

const emptyMaterialForm = {
  name: '',
  unit: 'g',
  on_hand_qty: '',
  low_stock_qty: '',
  icon: '📦',
};

export default function MenuCatalogPage() {
  const { brand } = useBrand();

  const [bundle, setBundle] = useState<CatalogBundle | null>(null);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<RecipeLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');
  const [catalogReady, setCatalogReady] = useState(true);

  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);

  const load = useCallback(async () => {
    setSyncing(true);
    try {
      const [catalog, rawMaterials, recipeLines] = await Promise.all([
        fetchMenuCatalog(brand.dbBrandId),
        fetchRawMaterials(brand.dbBrandId),
        fetchRecipes(brand.dbBrandId),
      ]);

      if (catalog) {
        setBundle(catalog);
        setCatalogReady(true);
        setNotice('');
      } else {
        // Leave bundle null so the static brand menu preview keeps showing.
        setBundle(null);
        setCatalogReady(false);
        setNotice(
          'Showing the built-in brand menu as a preview. Run supabase-menu-catalog-setup.sql in Supabase to enable live HQ editing. POS uses this same menu until then.'
        );
      }
      setMaterials(rawMaterials);
      setRecipes(recipeLines);
    } catch {
      setBundle(null);
      setCatalogReady(false);
      setNotice('Could not reach Supabase, showing the built-in brand menu preview. Try Refresh once connected.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [brand.dbBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Static brand menu acts as the always-available preview/fallback so the page
  // never renders blank while Supabase is loading or before the catalog is set up.
  const fallbackBundle = useMemo<CatalogBundle>(
    () => ({
      categories: brand.menu.categories,
      products: brand.menu.products,
      variants: brand.menu.variants,
      addons: brand.menu.addons,
      productAddons: [],
    }),
    [brand.menu]
  );

  const displayBundle = bundle ?? fallbackBundle;
  const categories: Category[] = displayBundle.categories;
  const products: Product[] = displayBundle.products;
  const variants: ProductVariant[] = displayBundle.variants;
  const addons: Addon[] = displayBundle.addons;

  const materialsById = useMemo(() => {
    const map = new Map<string, RawMaterial>();
    materials.forEach((m) => map.set(m.id, m));
    return map;
  }, [materials]);

  const recipesByProduct = useMemo(() => {
    const map = new Map<string, RecipeLine[]>();
    recipes.forEach((r) => {
      const list = map.get(r.product_id) ?? [];
      list.push(r);
      map.set(r.product_id, list);
    });
    return map;
  }, [recipes]);

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, ProductVariant[]>();
    variants.forEach((v) => {
      const list = map.get(v.product_id) ?? [];
      list.push(v);
      map.set(v.product_id, list);
    });
    return map;
  }, [variants]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    if (activeCategoryId === 'all') return products;
    return products.filter((p) => p.category_id === activeCategoryId);
  }, [products, activeCategoryId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  const reportResult = (error: { message: string } | null, successText: string) => {
    if (error) {
      setNotice(`Action failed: ${error.message}`);
      return false;
    }
    setNotice(successText);
    return true;
  };

  const handleCreateProduct = async () => {
    if (!productForm.name.trim()) {
      setNotice('Product name is required.');
      return;
    }
    const { error } = await createProduct(brand.dbBrandId, {
      name: productForm.name.trim(),
      category_id: productForm.category_id,
      description: productForm.description.trim(),
      base_price: Number(productForm.base_price) || 0,
      icon: productForm.icon,
      customizable: productForm.customizable,
      is_active: true,
    });
    if (reportResult(error, `Added "${productForm.name.trim()}" to the catalog.`)) {
      setProductForm(emptyProductForm);
      setShowProductForm(false);
      await load();
    }
  };

  const handleToggleActive = async (product: Product) => {
    const { error } = await setProductActive(product.id, !product.is_active);
    if (reportResult(error, `${product.name} is now ${!product.is_active ? 'Active' : 'Inactive'}.`)) {
      await load();
    }
  };

  const handleAddVariant = async (
    productId: string,
    input: { name: string; abbr: string; additional_price: number }
  ) => {
    const sortOrder = (variantsByProduct.get(productId)?.length ?? 0) + 1;
    const { error } = await createVariant(productId, { ...input, sort_order: sortOrder });
    if (reportResult(error, 'Variant added.')) await load();
  };

  const handleDeleteVariant = async (variantId: string) => {
    const { error } = await deleteVariant(variantId);
    if (reportResult(error, 'Variant removed.')) await load();
  };

  const handleAddRecipe = async (input: {
    product_id: string;
    raw_material_id: string;
    quantity_per_cup: number;
    unit: string;
  }) => {
    const { error } = await createRecipeLine(input);
    if (reportResult(error, 'Recipe material added.')) await load();
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    const { error } = await deleteRecipeLine(recipeId);
    if (reportResult(error, 'Recipe material removed.')) await load();
  };

  const handleCreateMaterial = async () => {
    if (!materialForm.name.trim()) {
      setNotice('Raw material name is required.');
      return;
    }
    const { error } = await upsertRawMaterial(brand.dbBrandId, {
      name: materialForm.name.trim(),
      unit: materialForm.unit.trim() || 'g',
      on_hand_qty: Number(materialForm.on_hand_qty) || 0,
      low_stock_qty: Number(materialForm.low_stock_qty) || 0,
      icon: materialForm.icon,
    });
    if (reportResult(error, `Saved raw material "${materialForm.name.trim()}".`)) {
      setMaterialForm(emptyMaterialForm);
      await load();
    }
  };

  return (
    <div className="page-container catalog-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Menu Catalog</h1>
          <p>
            {loading
              ? `Loading ${brand.name} menu catalog...`
              : `${brand.name} source of truth for POS menus, variants, add-ons, and recipe yield.`}
          </p>
        </div>
        <div className="catalog-header-actions">
          <button className="btn-secondary" type="button" onClick={() => void load()} disabled={syncing}>
            <RefreshCw size={15} /> {syncing ? 'Syncing...' : 'Refresh'}
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={() => setShowProductForm((v) => !v)}
            disabled={!catalogReady}
          >
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {notice && <div className="catalog-note">{notice}</div>}

      {showProductForm && (
        <div className="catalog-form-card">
          <div className="catalog-form-grid">
            <label>
              Name
              <input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. Taro Milk Tea"
              />
            </label>
            <label>
              Category
              <select
                value={productForm.category_id}
                onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Base Price
              <input
                type="number"
                value={productForm.base_price}
                onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })}
                placeholder="0.00"
              />
            </label>
            <label>
              Icon
              <input
                value={productForm.icon}
                onChange={(e) => setProductForm({ ...productForm, icon: e.target.value })}
                maxLength={4}
              />
            </label>
            <label className="catalog-form-wide">
              Description
              <input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Short description shown on POS"
              />
            </label>
            <label className="catalog-form-checkbox">
              <input
                type="checkbox"
                checked={productForm.customizable}
                onChange={(e) => setProductForm({ ...productForm, customizable: e.target.checked })}
              />
              Customizable (sugar, ice, add-ons)
            </label>
          </div>
          <div className="catalog-form-actions">
            <button className="btn-secondary" type="button" onClick={() => setShowProductForm(false)}>
              Cancel
            </button>
            <button className="btn-primary" type="button" onClick={() => void handleCreateProduct()}>
              Save Product
            </button>
          </div>
        </div>
      )}

      <div className="catalog-category-tabs">
        <button
          type="button"
          className={activeCategoryId === 'all' ? 'catalog-tab active' : 'catalog-tab'}
          onClick={() => setActiveCategoryId('all')}
        >
          All ({products.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={activeCategoryId === c.id ? 'catalog-tab active' : 'catalog-tab'}
            onClick={() => setActiveCategoryId(c.id)}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <div className="catalog-layout">
        <div className="admin-table-container catalog-products">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Variants</th>
                <th>Est. Cups</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const productRecipes = recipesByProduct.get(product.id) ?? [];
                const estCups = computeProductYield(productRecipes, materialsById);
                return (
                  <tr
                    key={product.id}
                    className={selectedProductId === product.id ? 'catalog-row-selected' : ''}
                  >
                    <td className="catalog-product-name">
                      <span className="catalog-product-icon">{product.icon || '🧋'}</span>
                      {product.name}
                    </td>
                    <td>{categoryNameById.get(product.category_id) || 'Uncategorized'}</td>
                    <td>₱{product.base_price.toFixed(2)}</td>
                    <td>{variantsByProduct.get(product.id)?.length ?? 0}</td>
                    <td>
                      {estCups === null ? (
                        <span className="catalog-muted">—</span>
                      ) : (
                        <span className="catalog-yield-pill">{estCups} cups</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={product.is_active ? 'catalog-status active' : 'catalog-status inactive'}
                        onClick={() => void handleToggleActive(product)}
                        disabled={!catalogReady}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary catalog-manage-btn"
                        onClick={() =>
                          setSelectedProductId(selectedProductId === product.id ? null : product.id)
                        }
                      >
                        {selectedProductId === product.id ? 'Close' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="catalog-muted">
                    {catalogReady
                      ? 'No products yet. Use "Add Product" to create one.'
                      : 'Catalog tables not detected. Run the setup SQL to start managing the menu.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedProduct && (
          <ProductDetailPanel
            product={selectedProduct}
            variants={variantsByProduct.get(selectedProduct.id) ?? []}
            recipes={recipesByProduct.get(selectedProduct.id) ?? []}
            materials={materials}
            materialsById={materialsById}
            catalogReady={catalogReady}
            onClose={() => setSelectedProductId(null)}
            onAddVariant={handleAddVariant}
            onDeleteVariant={handleDeleteVariant}
            onAddRecipe={handleAddRecipe}
            onDeleteRecipe={handleDeleteRecipe}
          />
        )}
      </div>

      <div className="catalog-bottom-grid">
        <section className="catalog-section">
          <h2>Add-ons</h2>
          <p className="catalog-section-sub">Shared toppings available across customizable drinks.</p>
          <AddonManager
            addons={addons}
            catalogReady={catalogReady}
            onAdd={async (input) => {
              const { error } = await createAddon(brand.dbBrandId, input);
              if (reportResult(error, 'Add-on saved.')) await load();
            }}
          />
        </section>

        <section className="catalog-section">
          <h2>Raw Materials</h2>
          <p className="catalog-section-sub">
            On-hand stock used to compute recipe yield. Est. cups assumes single-material usage.
          </p>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>On Hand</th>
                  <th>Low Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const low = m.on_hand_qty <= m.low_stock_qty;
                  return (
                    <tr key={m.id}>
                      <td className="catalog-product-name">
                        <span className="catalog-product-icon">{m.icon || '📦'}</span>
                        {m.name}
                      </td>
                      <td>
                        {m.on_hand_qty.toLocaleString()} {m.unit}
                      </td>
                      <td>
                        {m.low_stock_qty.toLocaleString()} {m.unit}
                      </td>
                      <td>
                        <span className={low ? 'catalog-status inactive' : 'catalog-status active'}>
                          {low ? 'Low' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {materials.length === 0 && (
                  <tr>
                    <td colSpan={4} className="catalog-muted">
                      No raw materials yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="catalog-inline-form">
            <input
              placeholder="Material name"
              value={materialForm.name}
              onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
            />
            <input
              className="catalog-input-sm"
              placeholder="Unit"
              value={materialForm.unit}
              onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
            />
            <input
              className="catalog-input-sm"
              type="number"
              placeholder="On hand"
              value={materialForm.on_hand_qty}
              onChange={(e) => setMaterialForm({ ...materialForm, on_hand_qty: e.target.value })}
            />
            <input
              className="catalog-input-sm"
              type="number"
              placeholder="Low at"
              value={materialForm.low_stock_qty}
              onChange={(e) => setMaterialForm({ ...materialForm, low_stock_qty: e.target.value })}
            />
            <button
              className="btn-primary"
              type="button"
              onClick={() => void handleCreateMaterial()}
              disabled={!catalogReady}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

interface ProductDetailPanelProps {
  product: Product;
  variants: ProductVariant[];
  recipes: RecipeLine[];
  materials: RawMaterial[];
  materialsById: Map<string, RawMaterial>;
  catalogReady: boolean;
  onClose: () => void;
  onAddVariant: (
    productId: string,
    input: { name: string; abbr: string; additional_price: number }
  ) => Promise<void>;
  onDeleteVariant: (variantId: string) => Promise<void>;
  onAddRecipe: (input: {
    product_id: string;
    raw_material_id: string;
    quantity_per_cup: number;
    unit: string;
  }) => Promise<void>;
  onDeleteRecipe: (recipeId: string) => Promise<void>;
}

function ProductDetailPanel({
  product,
  variants,
  recipes,
  materials,
  materialsById,
  catalogReady,
  onClose,
  onAddVariant,
  onDeleteVariant,
  onAddRecipe,
  onDeleteRecipe,
}: ProductDetailPanelProps) {
  const [variantName, setVariantName] = useState('');
  const [variantAbbr, setVariantAbbr] = useState('');
  const [variantPrice, setVariantPrice] = useState('');

  const [recipeMaterialId, setRecipeMaterialId] = useState('');
  const [recipeQty, setRecipeQty] = useState('');

  const estCups = computeProductYield(recipes, materialsById);

  const submitVariant = async () => {
    if (!variantName.trim() || !variantAbbr.trim()) return;
    await onAddVariant(product.id, {
      name: variantName.trim(),
      abbr: variantAbbr.trim().toUpperCase(),
      additional_price: Number(variantPrice) || 0,
    });
    setVariantName('');
    setVariantAbbr('');
    setVariantPrice('');
  };

  const submitRecipe = async () => {
    const material = materialsById.get(recipeMaterialId);
    if (!material || !recipeQty) return;
    await onAddRecipe({
      product_id: product.id,
      raw_material_id: recipeMaterialId,
      quantity_per_cup: Number(recipeQty) || 0,
      unit: material.unit,
    });
    setRecipeMaterialId('');
    setRecipeQty('');
  };

  return (
    <aside className="catalog-detail">
      <div className="catalog-detail-head">
        <div>
          <h3>
            {product.icon} {product.name}
          </h3>
          <span className="catalog-muted">₱{product.base_price.toFixed(2)} base</span>
        </div>
        <button type="button" className="catalog-icon-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="catalog-detail-section">
        <h4>Variants ({variants.length})</h4>
        <ul className="catalog-chip-list">
          {variants.map((v) => (
            <li key={v.id} className="catalog-chip">
              <span>
                {v.name} <strong>+₱{v.additional_price.toFixed(0)}</strong>
              </span>
              <button
                type="button"
                className="catalog-chip-remove"
                onClick={() => void onDeleteVariant(v.id)}
                disabled={!catalogReady}
                aria-label={`Remove ${v.name}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
          {variants.length === 0 && <li className="catalog-muted">No variants.</li>}
        </ul>
        <div className="catalog-inline-form">
          <input
            placeholder="Variant name"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
          />
          <input
            className="catalog-input-sm"
            placeholder="Abbr"
            value={variantAbbr}
            onChange={(e) => setVariantAbbr(e.target.value)}
          />
          <input
            className="catalog-input-sm"
            type="number"
            placeholder="+₱"
            value={variantPrice}
            onChange={(e) => setVariantPrice(e.target.value)}
          />
          <button className="btn-primary" type="button" onClick={() => void submitVariant()} disabled={!catalogReady}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="catalog-detail-section">
        <h4>Recipe &amp; Yield</h4>
        {estCups !== null && (
          <div className="catalog-yield-summary">
            Estimated <strong>{estCups} cups</strong> from current stock (limiting material).
          </div>
        )}
        <ul className="catalog-recipe-list">
          {recipes.map((r) => {
            const material = materialsById.get(r.raw_material_id);
            const cups = material
              ? computeMaterialYield(material.on_hand_qty, r.quantity_per_cup)
              : 0;
            return (
              <li key={r.id} className="catalog-recipe-line">
                <div>
                  <strong>{material?.name ?? 'Unknown material'}</strong>
                  <span className="catalog-muted">
                    {r.quantity_per_cup}
                    {r.unit} per cup → {cups} cups
                  </span>
                </div>
                <button
                  type="button"
                  className="catalog-chip-remove"
                  onClick={() => void onDeleteRecipe(r.id)}
                  disabled={!catalogReady}
                  aria-label="Remove material"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
          {recipes.length === 0 && <li className="catalog-muted">No recipe materials defined.</li>}
        </ul>
        <div className="catalog-inline-form">
          <select value={recipeMaterialId} onChange={(e) => setRecipeMaterialId(e.target.value)}>
            <option value="">Select material…</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit})
              </option>
            ))}
          </select>
          <input
            className="catalog-input-sm"
            type="number"
            placeholder="Per cup"
            value={recipeQty}
            onChange={(e) => setRecipeQty(e.target.value)}
          />
          <button className="btn-primary" type="button" onClick={() => void submitRecipe()} disabled={!catalogReady}>
            <Plus size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

interface AddonManagerProps {
  addons: Addon[];
  catalogReady: boolean;
  onAdd: (input: { name: string; price: number }) => Promise<void>;
}

function AddonManager({ addons, catalogReady, onAdd }: AddonManagerProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    await onAdd({ name: name.trim(), price: Number(price) || 0 });
    setName('');
    setPrice('');
  };

  return (
    <>
      <ul className="catalog-chip-list">
        {addons.map((a) => (
          <li key={a.id} className="catalog-chip">
            <span>
              {a.name} <strong>+₱{a.price.toFixed(0)}</strong>
            </span>
          </li>
        ))}
        {addons.length === 0 && <li className="catalog-muted">No add-ons yet.</li>}
      </ul>
      <div className="catalog-inline-form">
        <input placeholder="Add-on name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className="catalog-input-sm"
          type="number"
          placeholder="+₱"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button className="btn-primary" type="button" onClick={() => void submit()} disabled={!catalogReady}>
          <Plus size={14} /> Add
        </button>
      </div>
    </>
  );
}
