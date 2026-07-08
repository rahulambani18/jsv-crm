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
  'Mumbai – Bhiwandi',
  'Delhi – Siraspur',
  'Delhi – Bhiwadi',
  'Chennai – Sriperumbudur',
]

export const COURIERS = [
  'Blue Dart', 'DTDC', 'Delhivery', 'India Post', 'FedEx', 'Professional Courier',
]

export const GST_RATE = 18

export function calcOrderTotals(lineItems, gstRate = GST_RATE) {
  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0)
  const gstAmount = Math.round(subtotal * (gstRate / 100) * 100) / 100
  const total = Math.round((subtotal + gstAmount) * 100) / 100
  return { subtotal: Math.round(subtotal * 100) / 100, gstAmount, total }
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
    id: 'o1', orderNo: 'ORD-2026-0301', customerId: 'c1', company: 'Patel Agro Industries', warehouse: 'Mumbai – Bhiwandi',
    orderDate: '2026-06-10', delivery: '2026-06-18',
    lineItems: [
      { product: 'Citric Acid', qty: 500, unit: 'kg', unitPrice: 220, lineTotal: 110000 },
      { product: 'Sodium Benzoate', qty: 100, unit: 'kg', unitPrice: 580, lineTotal: 58000 },
    ],
    subtotal: 158000, gstRate: 18, gstAmount: 28440, total: 186440,
    status: 'Delivered', payment: 'Paid',
  },
  {
    id: 'o2', orderNo: 'ORD-2026-0302', customerId: 'c2', company: 'Himalaya Dairy Co.', warehouse: 'Delhi – Bhiwadi',
    orderDate: '2026-06-21', delivery: '2026-06-29',
    lineItems: [
      { product: 'Carrageenan', qty: 80, unit: 'kg', unitPrice: 950, lineTotal: 76000 },
      { product: 'Calcium Lactate', qty: 25, unit: 'kg', unitPrice: 320, lineTotal: 8000 },
    ],
    subtotal: 84000, gstRate: 18, gstAmount: 15120, total: 99120,
    status: 'Dispatched', payment: 'Pending',
  },
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
  { key: 'products', label: 'Products' },
  { key: 'reports', label: 'Reports' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'documents', label: 'Documents' },
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
      products: { view: true, edit: false },
      reports: { view: true, edit: false },
      tasks: { view: true, edit: true },
      meetings: { view: true, edit: true },
      documents: { view: true, edit: true },
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

export const seedExpenses = [
  { id: 'exp1', expenseNo: 'EXP-2026-0011', category: 'Freight', description: 'Courier charges - Blue Dart June batch', amount: 8500, date: '2026-06-15', paidBy: 'Rahul', paymentMode: 'UPI', receipt: '', status: 'Approved' },
  { id: 'exp2', expenseNo: 'EXP-2026-0012', category: 'Office', description: 'Stationery and printing', amount: 2200, date: '2026-06-20', paidBy: 'Rahul', paymentMode: 'Cash', receipt: '', status: 'Approved' },
]
