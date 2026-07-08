-- JSV CRM — Complete Product List (from official product list PDF)
-- Run this in Supabase SQL Editor
-- Safe to re-run: duplicates are skipped automatically

insert into products (workspace_id, name, category, supplier, status)
values

-- ── ACIDITY REGULATORS / ANTI OXIDANTS ─────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Citric Acid Monohydrate / Anhydrous', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Tartaric Acid (DL/L+)', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Phosphoric Acid', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Potassium Carbonate', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'DL Malic Acid', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Citrate', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Acetic Acid', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Gluconate', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Ascorbic Acid (Vitamin C)', 'Acidity Regulators / Anti Oxidants', 'JSV Ingredient', 'Active'),

-- ── FLAVOUR ENHANCER ────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Vanillin / Ethyl Vanillin (Eternal Pearl/Jullan)', 'Flavour Enhancer', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Monosodium Glutamate (MSG)', 'Flavour Enhancer', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'I+G', 'Flavour Enhancer', 'JSV Ingredient', 'Active'),

-- ── THICKENER AND STABILIZER ────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Xanthan Gum 200 Mesh / 80 Mesh', 'Thickener and Stabilizer', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Pectin', 'Thickener and Stabilizer', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Carrageenan', 'Thickener and Stabilizer', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Gellan Gum', 'Thickener and Stabilizer', 'JSV Ingredient', 'Active'),

-- ── PRESERVATIVES ───────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Sorbic Acid', 'Preservatives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Potassium Sorbate', 'Preservatives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Benzoic Acid', 'Preservatives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Benzoate', 'Preservatives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Calcium Propionate', 'Preservatives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Propionate', 'Preservatives', 'JSV Ingredient', 'Active'),

-- ── RANGE OF LACTIC ACID & LACTATES ────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Lactic Acid 88% Heatstable', 'Lactic Acid & Lactates', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Lactic Acid 80%', 'Lactic Acid & Lactates', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Buffered Lactic Acid', 'Lactic Acid & Lactates', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Lactate', 'Lactic Acid & Lactates', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Calcium Lactate', 'Lactic Acid & Lactates', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'CLM (Citric / Lactic / Malic)', 'Lactic Acid & Lactates', 'JSV Ingredient', 'Active'),

-- ── SWEETENERS ──────────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Aspartame', 'Sweeteners', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Saccharin', 'Sweeteners', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Acesulfame-K', 'Sweeteners', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sucralose', 'Sweeteners', 'JSV Ingredient', 'Active'),

-- ── HUMECTANT ───────────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Propylene Glycol', 'Humectant', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Di Propylene Glycol (D.P.G.)', 'Humectant', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Glycerin Food Grade', 'Humectant', 'JSV Ingredient', 'Active'),

-- ── GLAZING AGENT ───────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Liquid Paraffin Light', 'Glazing Agent', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Liquid Paraffin Heavy', 'Glazing Agent', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Paraffin Wax', 'Glazing Agent', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Stearic Acid', 'Glazing Agent', 'JSV Ingredient', 'Active'),

-- ── OTHER FOOD ADDITIVES ─────────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Sodium Hydro Sulphite', 'Other Food Additives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Tri Polyphosphate', 'Other Food Additives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Acid Pyrophosphate', 'Other Food Additives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Vital Wheat Gluten', 'Other Food Additives', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Instant Dried Yeast', 'Other Food Additives', 'JSV Ingredient', 'Active'),

-- ── EMULSIFIER ──────────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Glyceryl Mono Stearate (GMS)', 'Emulsifier', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Cake Gel', 'Emulsifier', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Diacetyl Tartaric Acid Esters of Mono and Diglycerides (DATEM)', 'Emulsifier', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Distilled Monoglyceride (DMG)', 'Emulsifier', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Stearoyl Lactylate (SSL)', 'Emulsifier', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Polyglycerol Polyricinoleate (PGPR)', 'Emulsifier', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sorbitan Mono/Tri Stearate', 'Emulsifier', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'PGMS', 'Emulsifier', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Polyglycerol Esters (PGE)', 'Emulsifier', 'JSV Ingredient', 'Active'),

-- ── RANGE OF COCOA POWDER ───────────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Jindal Cocoa', 'Cocoa Powder', 'JSV Ingredient', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Cocoa Powder (Indonesia/Malaysia)', 'Cocoa Powder', 'JSV Ingredient', 'Active'),

-- ── HARIHAR ORGANICS PRODUCTS ───────────────────────────────────────
('00000000-0000-0000-0000-000000000001', 'Potassium Stearate (for cake gel)', 'Harihar Organics', 'Harihar Organics Pvt Ltd', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Sodium Stearate (for cake gel)', 'Harihar Organics', 'Harihar Organics Pvt Ltd', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Magnesium Stearate', 'Harihar Organics', 'Harihar Organics Pvt Ltd', 'Active'),
('00000000-0000-0000-0000-000000000001', 'Calcium Stearate', 'Harihar Organics', 'Harihar Organics Pvt Ltd', 'Active')

on conflict do nothing;
