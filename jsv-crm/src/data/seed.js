// src/data/seed.js
// Demo dataset — mirrors the structure shown in the original JSV CRM screenshots.
// Swap or extend freely; this is what ships when running on the mock data layer.

export const seedProducts = [
  { id: 'p1', name: 'Acesulfame-K', category: 'Sweeteners', supplier: 'Vivion Inc.', origin: 'Germany', moq: '25 kg', docs: 'COA, MSDS', unitPrice: 850, status: 'Active' },
  { id: 'p2', name: 'Acetic Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'Celanese', origin: 'China', moq: '200 kg', docs: 'COA', unitPrice: 95, status: 'Active' },
  { id: 'p3', name: 'Ascorbic Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'DSM', origin: 'China', moq: '50 kg', docs: 'COA, MSDS, Halal', unitPrice: 410, status: 'Active' },
  { id: 'p4', name: 'Aspartame', category: 'Sweeteners', supplier: 'Ajinomoto', origin: 'Japan', moq: '25 kg', docs: 'COA, Kosher', unitPrice: 720, status: 'Active' },
  { id: 'p5', name: 'Benzoic Acid', category: 'Preservatives', supplier: 'Emerald Kalama', origin: 'USA', moq: '50 kg', docs: 'COA', unitPrice: 260, status: 'Active' },
  { id: 'p6', name: 'Buffered Lactic Acid', category: 'Lactic Acid & Lactates', supplier: 'Corbion', origin: 'Netherlands', moq: '200 kg', docs: 'COA, MSDS', unitPrice: 180, status: 'Active' },
  { id: 'p7', name: 'Calcium Lactate', category: 'Lactic Acid & Lactates', supplier: 'Jungbunzlauer', origin: 'Austria', moq: '25 kg', docs: 'COA', unitPrice: 320, status: 'Active' },
  { id: 'p8', name: 'Calcium Stearate', category: 'Harihar Organics', supplier: 'Harihar Organics', origin: 'India', moq: '25 kg', docs: '—', unitPrice: 150, status: 'Active' },
  { id: 'p9', name: 'Carrageenan', category: 'Thickener and Stabilizer', supplier: 'CP Kelco', origin: 'Philippines', moq: '25 kg', docs: 'COA, Halal', unitPrice: 950, status: 'Active' },
  { id: 'p10', name: 'Citric Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'RZBC', origin: 'China', moq: '500 kg', docs: 'COA, MSDS', unitPrice: 220, status: 'Active' },
  { id: 'p11', name: 'CLM (Citric / Lactic / Malic)', category: 'Lactic Acid & Lactates', supplier: 'Jungbunzlauer', origin: 'Austria', moq: '50 kg', docs: 'COA', unitPrice: 240, status: 'Active' },
  { id: 'p12', name: 'Di Propylene Glycol (D.P.G.)', category: 'Humectant', supplier: 'Dow', origin: 'Singapore', moq: '200 kg', docs: 'COA, MSDS', unitPrice: 310, status: 'Active' },
  { id: 'p13', name: 'DL+ Malic Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'Bartek', origin: 'Canada', moq: '50 kg', docs: 'COA', unitPrice: 280, status: 'Active' },
  { id: 'p14', name: 'DL+ Tartaric Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'Caviro', origin: 'Italy', moq: '50 kg', docs: 'COA', unitPrice: 300, status: 'Active' },
  { id: 'p15', name: 'Ethyl Vanillin', category: 'Flavour Enhancer', supplier: 'Solvay', origin: 'France', moq: '5 kg', docs: 'COA, Kosher', unitPrice: 2400, status: 'Active' },
  { id: 'p16', name: 'Guar Gum', category: 'Thickener and Stabilizer', supplier: 'Vikas WSP', origin: 'India', moq: '25 kg', docs: 'COA', unitPrice: 410, status: 'Active' },
  { id: 'p17', name: 'Potassium Sorbate', category: 'Preservatives', supplier: 'Niacet', origin: 'Netherlands', moq: '25 kg', docs: 'COA, Halal', unitPrice: 480, status: 'Active' },
  { id: 'p18', name: 'Sodium Benzoate', category: 'Preservatives', supplier: 'Emerald Kalama', origin: 'USA', moq: '50 kg', docs: 'COA', unitPrice: 580, status: 'Active' },
  { id: 'p19', name: 'Xanthan Gum', category: 'Thickener and Stabilizer', supplier: 'CP Kelco', origin: 'China', moq: '25 kg', docs: 'COA, Halal, Kosher', unitPrice: 890, status: 'Active' },
  { id: 'p20', name: 'Sodium Citrate', category: 'Acidity Regulators / Anti Oxidants', supplier: 'Jungbunzlauer', origin: 'Austria', moq: '50 kg', docs: 'COA', unitPrice: 260, status: 'Active' },

  // ── Added from JSV Ingredient product list PDF (items already above are skipped) ──
  { id: 'p21', name: 'Phosphoric Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p22', name: 'Potassium Carbonate', category: 'Acidity Regulators / Anti Oxidants', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p23', name: 'Sodium Gluconate', category: 'Acidity Regulators / Anti Oxidants', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p24', name: 'Vanillin / Ethyl Vanillin (Eternal Pearl/Jullan)', category: 'Flavour Enhancer', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p25', name: 'Monosodium Glutamate', category: 'Flavour Enhancer', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p26', name: 'I+G', category: 'Flavour Enhancer', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p27', name: 'Pectin', category: 'Thickener and Stabilizer', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p28', name: 'Gellan Gum', category: 'Thickener and Stabilizer', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p29', name: 'Sorbic Acid', category: 'Preservatives', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p30', name: 'Calcium Propionate', category: 'Preservatives', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p31', name: 'Sodium Propionate', category: 'Preservatives', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p32', name: 'Lactic Acid 88% Heatstable', category: 'Lactic Acid & Lactates', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p33', name: 'Lactic Acid 80%', category: 'Lactic Acid & Lactates', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p34', name: 'Sodium Lactate', category: 'Lactic Acid & Lactates', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p35', name: 'Sodium Saccharin', category: 'Sweeteners', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p36', name: 'Sucralose', category: 'Sweeteners', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p37', name: 'Propylene Glycol', category: 'Humectant', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p38', name: 'Glycerin Food Grade', category: 'Humectant', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p39', name: 'Liquid Paraffin Light', category: 'Glazing Agent', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p40', name: 'Liquid Paraffin Heavy', category: 'Glazing Agent', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p41', name: 'Paraffin Wax', category: 'Glazing Agent', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p42', name: 'Stearic Acid', category: 'Glazing Agent', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p43', name: 'Sodium Hydro Sulphite', category: 'Other Food Additives', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p44', name: 'Sodium Tri Polyphosphate', category: 'Other Food Additives', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p45', name: 'Sodium Acid Pyrophosphate', category: 'Other Food Additives', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p46', name: 'Vital Wheat Gluten', category: 'Other Food Additives', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p47', name: 'Instant Dried Yeast', category: 'Other Food Additives', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p48', name: 'Glyceryl Mono Stearate', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p49', name: 'Cake Gel', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p50', name: 'Diacetyl Tartaric Acid Esters of Mono and Diglycerides (DATEM)', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p51', name: 'Distilled Monoglyceride (DMG)', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p52', name: 'Sodium Stearoyl Lactylate (SSL)', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p53', name: 'Polyglycerol Polyricinoleate (PGPR)', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p54', name: 'Sorbitan Mono/Tri Stearate', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p55', name: 'PGMS', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p56', name: 'Polyglycerol Esters (PGE)', category: 'Emulsifier', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p57', name: 'Jindal Cocoa', category: 'Cocoa Powder', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p58', name: 'Cocoa Powder (Indonesia/Malaysia)', category: 'Cocoa Powder', supplier: 'JSV Ingredient', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p59', name: 'Potassium Stearate (for cake gel)', category: 'Harihar Organics', supplier: 'Harihar Organics Pvt Ltd', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p60', name: 'Sodium Stearate (for cake gel)', category: 'Harihar Organics', supplier: 'Harihar Organics Pvt Ltd', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
  { id: 'p61', name: 'Magnesium Stearate', category: 'Harihar Organics', supplier: 'Harihar Organics Pvt Ltd', origin: '—', moq: '—', docs: '—', unitPrice: 0, status: 'Active' },
]

export const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Sample Sent',
  'Quotation Sent',
  'Negotiation',
  'Converted Customer',
]

// Shared dropdown option lists, used across Leads / Customers / Samples forms.
// "Type manually" is handled in the UI by adding a free-text option when
// the user picks "Other" — see ComboField component.
export const INDUSTRY_OPTIONS = [
  'Bakery & Confectionery',
  'Beverages',
  'Dairy',
  'Snacks',
  'Pharma Excipients',
  'Organic Foods',
  'Spices & Seasoning',
  'Meat & Seafood Processing',
  'Nutraceuticals',
  'Animal Feed',
]

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Delhi', 'Gujarat', 'Haryana',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab',
  'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal',
]

export const WAREHOUSES = [
  'Mumbai (Bhiwandi)',
  'Delhi (Siraspur)',
  'Chennai (Ambattur Road)',
]

export const COURIERS = [
  'Blue Dart', 'DTDC', 'Delhivery', 'India Post', 'FedEx', 'Professional Courier',
]

export const GST_RATE = 18

export function calcOrderTotals(lineItems, gstRate = GST_RATE, deliveryCharge = 0) {
  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0)
  const delivery = Math.round((Number(deliveryCharge) || 0) * 100) / 100
  // Delivery is added first, then GST is calculated on (subtotal + delivery).
  const gstAmount = Math.round((subtotal + delivery) * (gstRate / 100) * 100) / 100
  const total = Math.round((subtotal + delivery + gstAmount) * 100) / 100
  return { subtotal: Math.round(subtotal * 100) / 100, gstAmount, deliveryCharge: delivery, total }
}


export const seedLeads = [
  { id: 'l1', company: 'Devansh Foods Pvt Ltd', contact: 'Anand Mehta', phone: '+91 98200 11234', city: 'Ahmedabad', priority: 'High', status: 'Negotiation', estValue: 480000, nextFollowUp: '2026-06-29', industry: 'Bakery & Confectionery', products: ['Citric Acid', 'Guar Gum'] },
  { id: 'l2', company: 'Sunrise Beverages', contact: 'Komal Iyer', phone: '+91 90040 55678', city: 'Pune', priority: 'High', status: 'Quotation Sent', estValue: 312000, nextFollowUp: '2026-06-30', industry: 'Beverages', products: ['Acesulfame-K', 'Sodium Citrate'] },
  { id: 'l3', company: 'Vedant Dairy Solutions', contact: 'Rajiv Suri', phone: '+91 88500 22341', city: 'Indore', priority: 'Medium', status: 'Sample Sent', estValue: 165000, nextFollowUp: '2026-07-02', industry: 'Dairy', products: ['Calcium Lactate', 'Carrageenan'] },
  { id: 'l4', company: 'Madhuram Snacks', contact: 'Priya Nambiar', phone: '+91 99870 99021', city: 'Coimbatore', priority: 'Medium', status: 'Contacted', estValue: 96000, nextFollowUp: '2026-07-01', industry: 'Snacks', products: ['Sodium Benzoate'] },
  { id: 'l5', company: 'Orchid Pharma Excipients', contact: 'Sanjay Bhatt', phone: '+91 97250 41122', city: 'Vadodara', priority: 'Low', status: 'New Lead', estValue: 58000, nextFollowUp: '2026-07-04', industry: 'Pharma Excipients', products: ['Di Propylene Glycol (D.P.G.)'] },
  { id: 'l6', company: 'Greenleaf Organics', contact: 'Tara Bose', phone: '+91 94320 87765', city: 'Kolkata', priority: 'High', status: 'Sample Sent', estValue: 224000, nextFollowUp: '2026-06-28', industry: 'Organic Foods', products: ['Xanthan Gum', 'Ascorbic Acid'] },
  { id: 'l7', company: 'Northern Spice Co.', contact: 'Harpreet Saini', phone: '+91 98140 33210', city: 'Ludhiana', priority: 'Medium', status: 'Contacted', estValue: 78000, nextFollowUp: '2026-07-03', industry: 'Spices & Seasoning', products: ['Citric Acid'] },
  { id: 'l8', company: 'Coastal Confections', contact: 'Meera Pillai', phone: '+91 90030 12987', city: 'Kochi', priority: 'Low', status: 'New Lead', estValue: 41000, nextFollowUp: '2026-07-05', industry: 'Bakery & Confectionery', products: ['Aspartame'] },
]

export const seedCustomers = [
  { id: 'c1', code: 'CUST-0001', company: 'Patel Agro Industries', contact: 'Bhavesh Patel', mobile: '+91 98250 11122', email: 'bhavesh@patelagro.com', city: 'Rajkot', state: 'Gujarat', gst: '24AABCP1234F1Z5', industry: 'Snacks', application: 'Extruded Snacks', products: ['Citric Acid', 'Sodium Benzoate'], qty: '2.4 MT/mo', billingAddress: 'Plot 14, GIDC Industrial Estate, Rajkot, Gujarat 360003', shippingAddress: 'Plot 14, GIDC Industrial Estate, Rajkot, Gujarat 360003', added: '2026-03-12' },
  { id: 'c2', code: 'CUST-0002', company: 'Himalaya Dairy Co.', contact: 'Neha Thakur', mobile: '+91 98140 22334', email: 'neha@himalayadairy.in', city: 'Chandigarh', state: 'Punjab', gst: '04AACFH5678G1Z2', industry: 'Dairy', application: 'Flavoured Milk', products: ['Carrageenan', 'Calcium Lactate'], qty: '1.1 MT/mo', billingAddress: 'Industrial Area Phase 2, Chandigarh 160002', shippingAddress: 'Industrial Area Phase 2, Chandigarh 160002', added: '2026-04-02' },
  { id: 'c3', code: 'CUST-0003', company: 'Vitalia Beverages Ltd', contact: 'Arjun Khanna', mobile: '+91 98990 33445', email: 'arjun@vitaliabev.com', city: 'Gurugram', state: 'Haryana', gst: '06AADCV4321H1Z9', industry: 'Beverages', application: 'Diet Soda', products: ['Acesulfame-K', 'Aspartame'], qty: '3.0 MT/mo', billingAddress: 'Udyog Vihar Phase 4, Gurugram, Haryana 122016', shippingAddress: 'Udyog Vihar Phase 4, Gurugram, Haryana 122016', added: '2026-04-20' },
]

export const seedSamples = [
  { id: 's1', code: 'SMP-1042', company: 'Greenleaf Organics', contact: 'Tara Bose', phone: '+91 94320 87765', email: 'tara@greenleaforganics.in', products: ['Xanthan Gum'], qty: '500 g', sent: '2026-06-20', courier: 'Blue Dart', tracking: 'BLR4471829IN', status: 'Delivered' },
  { id: 's2', code: 'SMP-1043', company: 'Vedant Dairy Solutions', contact: 'Rajiv Suri', phone: '+91 88500 22341', email: 'rajiv@vedantdairy.com', products: ['Calcium Lactate', 'Carrageenan'], qty: '1 kg', sent: '2026-06-22', courier: 'Delhivery', tracking: 'BLR4471955IN', status: 'In Transit' },
  { id: 's3', code: 'SMP-1044', company: 'Sunrise Beverages', contact: 'Komal Iyer', phone: '+91 90040 55678', email: 'komal@sunrisebev.com', products: ['Sodium Citrate'], qty: '250 g', sent: '2026-06-24', courier: 'DTDC', tracking: '—', status: 'Preparing' },
]

export const seedQuotations = [
  { id: 'q1', quoteNo: 'QT-2026-0118', company: 'Sunrise Beverages', items: 2, total: 312000, validUntil: '2026-07-15', status: 'Sent' },
  { id: 'q2', quoteNo: 'QT-2026-0119', company: 'Devansh Foods Pvt Ltd', items: 2, total: 480000, validUntil: '2026-07-10', status: 'Under Negotiation' },
]

export const seedOrders = [
  {
    id: 'o1', orderNo: 'ORD-2026-0301', customerId: 'c1', company: 'Patel Agro Industries', warehouse: 'Mumbai (Bhiwandi)',
    orderDate: '2026-06-10', delivery: '2026-06-18',
    lineItems: [
      { product: 'Citric Acid', qty: 500, unit: 'kg', unitPrice: 220, lineTotal: 110000 },
      { product: 'Sodium Benzoate', qty: 100, unit: 'kg', unitPrice: 580, lineTotal: 58000 },
    ],
    subtotal: 158000, gstRate: 18, gstAmount: 28440, total: 186440,
    status: 'Delivered', payment: 'Paid',
  },
  {
    id: 'o2', orderNo: 'ORD-2026-0302', customerId: 'c2', company: 'Himalaya Dairy Co.', warehouse: 'Delhi (Siraspur)',
    orderDate: '2026-06-21', delivery: '2026-06-29',
    lineItems: [
      { product: 'Carrageenan', qty: 80, unit: 'kg', unitPrice: 950, lineTotal: 76000 },
      { product: 'Calcium Lactate', qty: 25, unit: 'kg', unitPrice: 320, lineTotal: 8000 },
    ],
    subtotal: 84000, gstRate: 18, gstAmount: 15120, total: 99120,
    status: 'Dispatched', payment: 'Pending',
  },
]

export const seedStock = [
  { id: 'st1', product: 'Citric Acid', warehouse: 'Mumbai (Bhiwandi)', unit: 'kg', qtyOnHand: 700, reorderLevel: 500, expiryDate: '2027-03-15', batchNumber: 'B-2026-0605', lotNumber: 'RZBC-L118', manufacturingDate: '2026-01-15', barcode: '8901234500017', reservedQty: 150, damagedQty: 0 },
  { id: 'st1b', product: 'Citric Acid', warehouse: 'Mumbai (Bhiwandi)', unit: 'kg', qtyOnHand: 400, reorderLevel: 500, expiryDate: '2027-05-01', batchNumber: 'B-2026-0702', lotNumber: 'RZBC-L129', manufacturingDate: '2026-06-04', barcode: '8901234500086', reservedQty: 0, damagedQty: 0 },
  { id: 'st2', product: 'Sodium Benzoate', warehouse: 'Mumbai (Bhiwandi)', unit: 'kg', qtyOnHand: 180, reorderLevel: 200, expiryDate: '2026-07-10', batchNumber: 'B-2026-0608', lotNumber: 'EK-L502', manufacturingDate: '2026-01-08', barcode: '8901234500024', reservedQty: 0, damagedQty: 0 },
  { id: 'st3', product: 'Carrageenan', warehouse: 'Delhi (Siraspur)', unit: 'kg', qtyOnHand: 320, reorderLevel: 100, expiryDate: '2026-12-01', batchNumber: 'B-2026-0412', lotNumber: 'CG-L090', manufacturingDate: '2025-12-01', barcode: '8901234500031', reservedQty: 40, damagedQty: 0 },
  { id: 'st4', product: 'Calcium Lactate', warehouse: 'Delhi (Siraspur)', unit: 'kg', qtyOnHand: 40, reorderLevel: 50, expiryDate: '2026-06-18', batchNumber: 'B-2026-0301', lotNumber: 'CL-L044', manufacturingDate: '2025-12-18', barcode: '8901234500048', reservedQty: 0, damagedQty: 5 },
  { id: 'st5', product: 'Xanthan Gum', warehouse: 'Mumbai (Bhiwandi)', unit: 'kg', qtyOnHand: 5, reorderLevel: 75, expiryDate: '2026-08-05', batchNumber: 'B-2026-0201', lotNumber: 'XG-L012', manufacturingDate: '2026-02-05', barcode: '8901234500055', reservedQty: 0, damagedQty: 0 },
  { id: 'st6', product: 'Guar Gum', warehouse: 'Chennai (Ambattur Road)', unit: 'kg', qtyOnHand: 0, reorderLevel: 50, expiryDate: '2026-09-01', batchNumber: '', lotNumber: '', manufacturingDate: '', barcode: '8901234500062', reservedQty: 0, damagedQty: 0 },
  { id: 'st7', product: 'Ascorbic Acid', warehouse: 'Delhi (Siraspur)', unit: 'kg', qtyOnHand: 610, reorderLevel: 150, expiryDate: '2026-07-01', batchNumber: 'B-2026-0510', lotNumber: 'AA-L221', manufacturingDate: '2026-01-01', barcode: '8901234500079', reservedQty: 60, damagedQty: 10 },
]

export const seedStockMovements = [
  { id: 'sm1', product: 'Citric Acid', warehouse: 'Mumbai (Bhiwandi)', type: 'Received', qty: 1200, reference: 'PO-4471', notes: 'From RZBC', date: '2026-06-05', batchNumber: 'B-2026-0605', lotNumber: 'RZBC-L118', manufacturingDate: '2026-01-15' },
  { id: 'sm2', product: 'Citric Acid', warehouse: 'Mumbai (Bhiwandi)', type: 'Dispatched', qty: 500, reference: 'ORD-2026-0301', notes: '', date: '2026-06-18', batchNumber: 'B-2026-0605' },
  { id: 'sm2b', product: 'Citric Acid', warehouse: 'Mumbai (Bhiwandi)', type: 'Received', qty: 400, reference: 'PO-4519', notes: 'From RZBC', date: '2026-07-02', batchNumber: 'B-2026-0702', lotNumber: 'RZBC-L129', manufacturingDate: '2026-06-04' },
  { id: 'sm3', product: 'Sodium Benzoate', warehouse: 'Mumbai (Bhiwandi)', type: 'Received', qty: 280, reference: 'PO-4488', notes: 'From Emerald Kalama', date: '2026-06-08', batchNumber: 'B-2026-0608', lotNumber: 'EK-L502', manufacturingDate: '2026-01-08' },
  { id: 'sm4', product: 'Sodium Benzoate', warehouse: 'Mumbai (Bhiwandi)', type: 'Dispatched', qty: 100, reference: 'ORD-2026-0301', notes: '', date: '2026-06-18', batchNumber: 'B-2026-0608' },
  { id: 'sm5', product: 'Calcium Lactate', warehouse: 'Delhi (Siraspur)', type: 'Adjustment', qty: -5, reference: '', notes: 'Damaged bag, written off', date: '2026-06-27', batchNumber: 'B-2026-0301' },
]

export const seedFollowUps = [
  { id: 'f1', date: '2026-06-28', type: 'Call', lead: 'Greenleaf Organics', contact: 'Tara Bose', notes: 'Confirm sample feedback on Xanthan Gum viscosity', status: 'Upcoming' },
  { id: 'f2', date: '2026-06-29', type: 'Meeting', lead: 'Devansh Foods Pvt Ltd', contact: 'Anand Mehta', notes: 'Final price negotiation — site visit requested', status: 'Today' },
  { id: 'f3', date: '2026-06-25', type: 'Email', lead: 'Northern Spice Co.', contact: 'Harpreet Saini', notes: 'Sent product catalogue + MOQ sheet', status: 'Completed' },
  { id: 'f4', date: '2026-06-24', type: 'Call', lead: 'Madhuram Snacks', contact: 'Priya Nambiar', notes: 'No answer, retry tomorrow', status: 'Overdue' },
]

// ---------- Users & Roles ----------
// Every page in the sidebar is a "module" here. A role grants view/edit
// per module — this is what the admin's Users & Roles screen edits.
export const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'leads', label: 'Leads' },
  { key: 'follow_ups', label: 'Follow-ups' },
  { key: 'customers', label: 'Customers' },
  { key: 'samples', label: 'Samples' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'orders', label: 'Orders' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'products', label: 'Products' },
  { key: 'reports', label: 'Reports' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'documents', label: 'Documents' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'users', label: 'Users & Roles' },
]

export const seedTasks = [
  { id: 't1', title: 'Follow up on Citric Acid quotation', description: 'Call Devansh Foods re: QT-2026-0119 — they asked for 5% discount', assignedTo: 'Rahul', relatedTo: 'Devansh Foods Pvt Ltd', type: 'Call', priority: 'High', dueDate: '2026-07-02', status: 'Pending' },
  { id: 't2', title: 'Send COA for Xanthan Gum to Greenleaf', description: 'They need batch COA before placing order', assignedTo: 'Rahul', relatedTo: 'Greenleaf Organics', type: 'Document', priority: 'High', dueDate: '2026-06-30', status: 'Pending' },
  { id: 't3', title: 'Arrange freight quote for Delhi delivery', description: 'Himalaya Dairy order — compare Blue Dart vs Delhivery rates', assignedTo: 'Priya Shah', relatedTo: 'Himalaya Dairy Co.', type: 'Internal', priority: 'Medium', dueDate: '2026-07-01', status: 'In Progress' },
  { id: 't4', title: 'Update price list for Q3', description: 'Revise unit prices for Citric Acid, Sodium Benzoate, Xanthan Gum based on new landed costs', assignedTo: 'Rahul', relatedTo: '', type: 'Internal', priority: 'Medium', dueDate: '2026-07-05', status: 'Pending' },
  { id: 't5', title: 'Collect GST certificate from Vitalia Beverages', description: 'Needed for account opening formalities', assignedTo: 'Karan Mehta', relatedTo: 'Vitalia Beverages Ltd', type: 'Document', priority: 'Low', dueDate: '2026-07-08', status: 'Completed' },
]

export const seedMeetings = [
  { id: 'm1', title: 'Site visit — Devansh Foods', company: 'Devansh Foods Pvt Ltd', contact: 'Anand Mehta', date: '2026-06-29', time: '11:00', location: 'Ahmedabad Plant', type: 'Site Visit', agenda: 'Final price negotiation on Citric Acid + Guar Gum. Discuss annual contract possibility.', status: 'Scheduled', notes: '' },
  { id: 'm2', title: 'Intro call — Northern Spice Co.', company: 'Northern Spice Co.', contact: 'Harpreet Saini', date: '2026-07-03', time: '14:30', location: 'Video Call (Google Meet)', type: 'Video Call', agenda: 'Understand their preservative requirements, share our catalogue and pricing.', status: 'Scheduled', notes: '' },
  { id: 'm3', title: 'Sample review — Greenleaf Organics', company: 'Greenleaf Organics', contact: 'Tara Bose', date: '2026-06-27', time: '10:00', location: 'Phone', type: 'Call', agenda: 'Review Xanthan Gum sample test results. Discuss purity specs.', status: 'Completed', notes: 'Customer happy with viscosity. Will send PO by next week.' },
]

export const seedDocuments = [
  { id: 'd1', name: 'Citric Acid — COA Batch #CIT2604', type: 'COA', relatedProduct: 'Citric Acid', uploadedBy: 'Rahul', date: '2026-06-15', url: '', tags: ['COA', 'Food Grade'] },
  { id: 'd2', name: 'Xanthan Gum — MSDS', type: 'MSDS', relatedProduct: 'Xanthan Gum', uploadedBy: 'Rahul', date: '2026-06-10', url: '', tags: ['MSDS', 'Halal'] },
  { id: 'd3', name: 'Harihar Organics — ISO Certificate 2025', type: 'Certificate', relatedProduct: '', uploadedBy: 'Rahul', date: '2026-05-20', url: '', tags: ['ISO', 'Certificate'] },
  { id: 'd4', name: 'Vitalia Beverages — Sales Contract 2026', type: 'Contract', relatedProduct: '', uploadedBy: 'Rahul', date: '2026-04-01', url: '', tags: ['Contract'] },
]

function fullAccess() {
  return Object.fromEntries(MODULES.map((m) => [m.key, { view: true, edit: true }]))
}

export const seedRoles = [
  {
    id: 'r1',
    name: 'Admin',
    isSystem: true,
    permissions: fullAccess(),
  },
  {
    id: 'r2',
    name: 'Sales Executive',
    isSystem: true,
    permissions: {
      dashboard: { view: true, edit: false },
      leads: { view: true, edit: true },
      follow_ups: { view: true, edit: true },
      customers: { view: true, edit: true },
      samples: { view: true, edit: true },
      quotations: { view: true, edit: true },
      orders: { view: true, edit: true },
      purchases: { view: true, edit: false },
      invoices: { view: true, edit: true },
      payments: { view: true, edit: true },
      inventory: { view: true, edit: false },
      products: { view: true, edit: false },
      reports: { view: true, edit: false },
      tasks: { view: true, edit: true },
      meetings: { view: true, edit: true },
      documents: { view: true, edit: true },
      logistics: { view: true, edit: true },
      users: { view: false, edit: false },
    },
  },
]

export const seedUsers = [
  { id: 'u1', name: 'Rahul', email: 'rahul@jsvchem.com', roleId: 'r1', status: 'Active', lastActive: '2026-06-29' },
  { id: 'u2', name: 'Priya Shah', email: 'priya@jsvchem.com', roleId: 'r2', status: 'Active', lastActive: '2026-06-27' },
  { id: 'u3', name: 'Karan Mehta', email: 'karan@jsvchem.com', roleId: 'r2', status: 'Active', lastActive: '2026-06-24' },
]

export const seedInvoices = [
  { id: 'inv1', invoiceNo: 'INV-2026-0041', orderId: 'o1', company: 'Patel Agro Industries', issueDate: '2026-06-10', dueDate: '2026-07-10', subtotal: 158051, cgst: 14225, sgst: 14225, igst: 0, total: 186501, status: 'Paid', paymentMode: 'NEFT' },
  { id: 'inv2', invoiceNo: 'INV-2026-0042', orderId: 'o2', company: 'Himalaya Dairy Co.', issueDate: '2026-06-21', dueDate: '2026-07-21', subtotal: 79831, cgst: 7186, sgst: 7186, igst: 0, total: 94203, status: 'Unpaid', paymentMode: '' },
]

export const seedPayments = [
  { id: 'pay1', paymentNo: 'PAY-2026-0021', invoiceId: 'inv1', company: 'Patel Agro Industries', amount: 186501, date: '2026-06-18', mode: 'NEFT', reference: 'NEFT2026061800123', notes: 'Full payment received', status: 'Completed' },
]

// ---------- Logistics / Transport ----------
// Standalone shipment/trip records — optionally reference an order via
// orderNo, but don't require one (e.g. a sample courier run or a direct
// pickup). freightPaidBy/freightPaymentStatus drive the Transporters
// ledger tab (amounts owed to each transporter for "To Pay"/prepaid trips).
// ---------- Purchase / Procurement ----------
export const seedSuppliers = [
  { id: 'sup1', code: 'SUPP-0001', name: 'RZBC', contact: 'Wei Chen', phone: '+86 512 6688 1122', email: 'wei.chen@rzbc.com', city: 'Suzhou', state: '', gst: '', category: 'Acidity Regulators / Anti Oxidants', paymentTerms: 'Net 45', notes: 'Primary Citric Acid supplier, LC payment preferred', status: 'Active', added: '2025-11-02' },
  { id: 'sup2', code: 'SUPP-0002', name: 'Emerald Kalama', contact: 'Mark Reynolds', phone: '+1 253 872 8200', email: 'mark.reynolds@emeraldkalama.com', city: 'Tacoma', state: '', gst: '', category: 'Preservatives', paymentTerms: 'Net 30', notes: '', status: 'Active', added: '2025-11-10' },
  { id: 'sup3', code: 'SUPP-0003', name: 'CP Kelco', contact: 'Anna Suwanto', phone: '+63 2 8845 2200', email: 'anna.suwanto@cpkelco.com', city: 'Manila', state: '', gst: '', category: 'Thickener and Stabilizer', paymentTerms: 'Net 30', notes: 'Carrageenan + Xanthan Gum', status: 'Active', added: '2025-12-01' },
  { id: 'sup4', code: 'SUPP-0004', name: 'Jungbunzlauer', contact: 'Peter Hoffmann', phone: '+43 1 89 100 0', email: 'peter.hoffmann@jungbunzlauer.com', city: 'Vienna', state: '', gst: '', category: 'Lactic Acid & Lactates', paymentTerms: 'Net 60', notes: 'Annual contract renewed March', status: 'Active', added: '2026-01-15' },
  { id: 'sup5', code: 'SUPP-0005', name: 'Harihar Organics', contact: 'Vishal Rao', phone: '+91 79 2630 1122', email: 'vishal@hariharorganics.in', city: 'Ahmedabad', state: 'Gujarat', gst: '24AABCH2345K1Z8', category: 'Other Food Additives', paymentTerms: 'Net 15', notes: 'Domestic supplier, GST invoicing', status: 'Active', added: '2026-02-04' },
]

function poLineItems(items) {
  return items.map((li) => ({ ...li, lineTotal: Math.round(li.qty * li.unitPrice * 100) / 100, qtyReceived: li.qtyReceived || 0 }))
}

export const seedPurchaseOrders = [
  {
    id: 'po1', poNo: 'PUR-2026-0001', supplierId: 'sup1', supplier: 'RZBC', warehouse: 'Mumbai (Bhiwandi)',
    orderDate: '2026-06-01', expectedDelivery: '2026-07-02',
    lineItems: poLineItems([{ product: 'Citric Acid', qty: 1000, unit: 'kg', unitPrice: 195, qtyReceived: 1000 }]),
    subtotal: 195000, gstRate: 18, gstAmount: 35100, total: 230100,
    status: 'Received', assignedTo: 'Rahul', notes: '',
    receipts: [{ id: 'grn1', date: '2026-07-02', items: [{ product: 'Citric Acid', qty: 1000 }], notes: 'Full quantity received, quality OK', receivedBy: 'Rahul' }],
  },
  {
    id: 'po2', poNo: 'PUR-2026-0002', supplierId: 'sup2', supplier: 'Emerald Kalama', warehouse: 'Mumbai (Bhiwandi)',
    orderDate: '2026-06-20', expectedDelivery: '2026-07-20',
    lineItems: poLineItems([{ product: 'Sodium Benzoate', qty: 300, unit: 'kg', unitPrice: 560, qtyReceived: 150 }]),
    subtotal: 168000, gstRate: 18, gstAmount: 30240, total: 198240,
    status: 'Partially Received', assignedTo: 'Priya Shah', notes: 'Split shipment, second half awaited',
    receipts: [{ id: 'grn2', date: '2026-07-10', items: [{ product: 'Sodium Benzoate', qty: 150 }], notes: 'First half received', receivedBy: 'Priya Shah' }],
  },
  {
    id: 'po3', poNo: 'PUR-2026-0003', supplierId: 'sup3', supplier: 'CP Kelco', warehouse: 'Delhi (Siraspur)',
    orderDate: '2026-07-05', expectedDelivery: '2026-08-01',
    lineItems: poLineItems([{ product: 'Carrageenan', qty: 200, unit: 'kg', unitPrice: 900 }, { product: 'Xanthan Gum', qty: 100, unit: 'kg', unitPrice: 840 }]),
    subtotal: 264000, gstRate: 18, gstAmount: 47520, total: 311520,
    status: 'Sent', assignedTo: 'Rahul', notes: '',
    receipts: [],
  },
]

// Purchase Quotations (a.k.a. RFQ responses) — one row per supplier's
// quote against a requirement. Multiple quotes sharing the same rfqRef
// represent responses to the same RFQ and are what the "Compare" view
// in Purchases -> Quotations lines up side by side.
function pqLineItems(items) {
  return items.map((li) => ({ ...li, lineTotal: Math.round(li.qty * li.unitPrice * 100) / 100 }))
}
export const seedPurchaseQuotations = [
  {
    id: 'pq1', pqNo: 'PQ-2026-0001', rfqRef: 'RFQ-2026-0007', supplierId: 'sup1', supplier: 'RZBC',
    quoteDate: '2026-07-18', validUntil: '2026-08-20',
    lineItems: pqLineItems([{ product: 'Citric Acid', qty: 1000, unit: 'kg', unitPrice: 192 }]),
    subtotal: 192000, gstRate: 18, gstAmount: 34560, total: 226560,
    moq: 500, leadTimeDays: 21, paymentTerms: 'Net 45', status: 'Received', notes: 'LC payment preferred',
  },
  {
    id: 'pq2', pqNo: 'PQ-2026-0002', rfqRef: 'RFQ-2026-0007', supplierId: 'sup4', supplier: 'Jungbunzlauer',
    quoteDate: '2026-07-19', validUntil: '2026-08-15',
    lineItems: pqLineItems([{ product: 'Citric Acid', qty: 1000, unit: 'kg', unitPrice: 205 }]),
    subtotal: 205000, gstRate: 18, gstAmount: 36900, total: 241900,
    moq: 1000, leadTimeDays: 35, paymentTerms: 'Net 60', status: 'Received', notes: 'Premium EU-grade',
  },
  {
    id: 'pq3', pqNo: 'PQ-2026-0003', rfqRef: 'RFQ-2026-0007', supplierId: 'sup5', supplier: 'Harihar Organics',
    quoteDate: '2026-07-20', validUntil: '2026-08-10',
    lineItems: pqLineItems([{ product: 'Citric Acid', qty: 1000, unit: 'kg', unitPrice: 198 }]),
    subtotal: 198000, gstRate: 18, gstAmount: 35640, total: 233640,
    moq: 250, leadTimeDays: 10, paymentTerms: 'Net 15', status: 'Received', notes: 'Domestic, fastest lead time',
  },
  {
    id: 'pq4', pqNo: 'PQ-2026-0004', rfqRef: 'RFQ-2026-0008', supplierId: 'sup2', supplier: 'Emerald Kalama',
    quoteDate: '2026-07-22', validUntil: '2026-08-22',
    lineItems: pqLineItems([{ product: 'Sodium Benzoate', qty: 300, unit: 'kg', unitPrice: 560 }]),
    subtotal: 168000, gstRate: 18, gstAmount: 30240, total: 198240,
    moq: 200, leadTimeDays: 14, paymentTerms: 'Net 30', status: 'Received', notes: '',
  },
  {
    id: 'pq5', pqNo: 'PQ-2026-0005', rfqRef: 'RFQ-2026-0008', supplierId: 'sup3', supplier: 'CP Kelco',
    quoteDate: '2026-07-23', validUntil: '2026-08-23',
    lineItems: pqLineItems([{ product: 'Sodium Benzoate', qty: 300, unit: 'kg', unitPrice: 585 }]),
    subtotal: 175500, gstRate: 18, gstAmount: 31590, total: 207090,
    moq: 100, leadTimeDays: 20, paymentTerms: 'Net 30', status: 'Received', notes: '',
  },
]

export const seedSupplierBills = [
  { id: 'sb1', billNo: 'SBILL-2026-0001', supplierId: 'sup1', supplier: 'RZBC', poId: 'po1', poNo: 'PUR-2026-0001', supplierInvoiceNo: 'RZBC-INV-88213', billDate: '2026-07-02', dueDate: '2026-08-16', subtotal: 195000, gstAmount: 35100, total: 230100, amountPaid: 230100, status: 'Paid', notes: '' },
  { id: 'sb2', billNo: 'SBILL-2026-0002', supplierId: 'sup2', supplier: 'Emerald Kalama', poId: 'po2', poNo: 'PUR-2026-0002', supplierInvoiceNo: 'EK-2026-4471', billDate: '2026-07-10', dueDate: '2026-08-09', subtotal: 84000, gstAmount: 15120, total: 99120, amountPaid: 40000, status: 'Partial', notes: 'Billed for the received half only' },
]

export const seedSupplierPayments = [
  { id: 'spay1', paymentNo: 'SPAY-2026-0001', billId: 'sb1', supplier: 'RZBC', amount: 230100, date: '2026-07-08', mode: 'Wire Transfer', reference: 'WT2026070800321', notes: 'Full settlement', status: 'Completed' },
  { id: 'spay2', paymentNo: 'SPAY-2026-0002', billId: 'sb2', supplier: 'Emerald Kalama', amount: 40000, date: '2026-07-14', mode: 'NEFT', reference: 'NEFT2026071400456', notes: 'Part payment', status: 'Completed' },
]

export const seedShipments = [
  {
    id: 'sh1', shipmentNo: 'SHP-2026-0041', orderNo: 'ORD-2026-0301', invoiceNo: 'INV-2026-0041', company: 'Patel Agro Industries',
    origin: 'Mumbai (Bhiwandi)', destination: 'Rajkot, Gujarat', transporter: 'VRL Logistics',
    vehicleNo: 'MH04AB1234', driverName: 'Suresh Yadav', driverPhone: '+91 98200 11223', mode: 'Road',
    lrNumber: 'LR-88213', dispatchDate: '2026-06-16', expectedDelivery: '2026-06-18', actualDelivery: '2026-06-18',
    status: 'Delivered', distanceKm: 280, freightCost: 8500, freightPaidBy: 'Us (Prepaid)', freightPaymentStatus: 'Paid', amountPaid: 8500,
    ewayBillNo: '', notes: 'Standard drum packaging, handled with care slip attached.',
  },
  {
    id: 'sh2', shipmentNo: 'SHP-2026-0042', orderNo: 'ORD-2026-0302', invoiceNo: 'INV-2026-0042', company: 'Himalaya Dairy Co.',
    origin: 'Delhi (Siraspur)', destination: 'Chandigarh, Punjab', transporter: 'Delhivery',
    vehicleNo: 'DL1LAB4567', driverName: 'Ramesh Kumar', driverPhone: '+91 98110 22334', mode: 'Road',
    lrNumber: 'LR-88254', dispatchDate: '2026-06-27', expectedDelivery: '2026-06-29', actualDelivery: '2026-06-29',
    status: 'Delivered', distanceKm: 250, freightCost: 6200, freightPaidBy: 'Us (Prepaid)', freightPaymentStatus: 'Unpaid', amountPaid: 0,
    ewayBillNo: '', notes: '',
  },
  {
    id: 'sh3', shipmentNo: 'SHP-2026-0043', orderNo: '', invoiceNo: '', company: 'Vitalia Beverages Ltd',
    origin: 'Mumbai (Bhiwandi)', destination: 'Gurugram, Haryana', transporter: 'VRL Logistics',
    vehicleNo: 'MH04CD5566', driverName: 'Anil Sharma', driverPhone: '+91 98200 44556', mode: 'Road',
    lrNumber: 'LR-88301', dispatchDate: '2026-06-30', expectedDelivery: '2026-07-03', actualDelivery: '',
    status: 'In Transit', distanceKm: 1420, freightCost: 21000, freightPaidBy: 'Us (Prepaid)', freightPaymentStatus: 'Partial', amountPaid: 10000,
    ewayBillNo: '', notes: 'Full truckload — combined with another customer\'s order.',
  },
  {
    id: 'sh4', shipmentNo: 'SHP-2026-0044', orderNo: '', invoiceNo: '', company: 'Devansh Foods Pvt Ltd',
    origin: 'Mumbai (Bhiwandi)', destination: 'Ahmedabad, Gujarat', transporter: 'Blue Dart',
    vehicleNo: '', driverName: '', driverPhone: '', mode: 'Road',
    lrNumber: '', dispatchDate: '2026-07-01', expectedDelivery: '2026-07-04', actualDelivery: '',
    status: 'Pending', distanceKm: 530, freightCost: 4800, freightPaidBy: 'Customer (To Pay)', freightPaymentStatus: 'Unpaid', amountPaid: 0,
    ewayBillNo: '', notes: 'Awaiting vehicle allocation from transporter.',
  },
  {
    id: 'sh5', shipmentNo: 'SHP-2026-0040', orderNo: '', invoiceNo: '', company: 'Greenleaf Organics',
    origin: 'Mumbai (Bhiwandi)', destination: 'Pune, Maharashtra', transporter: 'Delhivery',
    vehicleNo: 'MH12EF7788', driverName: 'Vikas Patil', driverPhone: '+91 98220 55667', mode: 'Road',
    lrNumber: 'LR-88190', dispatchDate: '2026-06-12', expectedDelivery: '2026-06-13', actualDelivery: '2026-06-14',
    status: 'Delayed', distanceKm: 150, freightCost: 3200, freightPaidBy: 'Us (Prepaid)', freightPaymentStatus: 'Paid', amountPaid: 3200,
    ewayBillNo: '', notes: 'Delayed a day due to vehicle breakdown, delivered fine.',
  },
]
