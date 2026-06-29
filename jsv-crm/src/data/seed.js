// src/data/seed.js
// Demo dataset — mirrors the structure shown in the original JSV CRM screenshots.
// Swap or extend freely; this is what ships when running on the mock data layer.

export const seedProducts = [
  { id: 'p1', name: 'Acesulfame-K', category: 'Sweeteners', supplier: 'Vivion Inc.', origin: 'Germany', moq: '25 kg', docs: 'COA, MSDS', status: 'Active' },
  { id: 'p2', name: 'Acetic Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'Celanese', origin: 'China', moq: '200 kg', docs: 'COA', status: 'Active' },
  { id: 'p3', name: 'Ascorbic Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'DSM', origin: 'China', moq: '50 kg', docs: 'COA, MSDS, Halal', status: 'Active' },
  { id: 'p4', name: 'Aspartame', category: 'Sweeteners', supplier: 'Ajinomoto', origin: 'Japan', moq: '25 kg', docs: 'COA, Kosher', status: 'Active' },
  { id: 'p5', name: 'Benzoic Acid', category: 'Preservatives', supplier: 'Emerald Kalama', origin: 'USA', moq: '50 kg', docs: 'COA', status: 'Active' },
  { id: 'p6', name: 'Buffered Lactic Acid', category: 'Lactic Acid & Lactates', supplier: 'Corbion', origin: 'Netherlands', moq: '200 kg', docs: 'COA, MSDS', status: 'Active' },
  { id: 'p7', name: 'Calcium Lactate', category: 'Lactic Acid & Lactates', supplier: 'Jungbunzlauer', origin: 'Austria', moq: '25 kg', docs: 'COA', status: 'Active' },
  { id: 'p8', name: 'Calcium Stearate', category: 'Harihar Organics', supplier: 'Harihar Organics', origin: 'India', moq: '25 kg', docs: '—', status: 'Active' },
  { id: 'p9', name: 'Carrageenan', category: 'Thickener and Stabilizer', supplier: 'CP Kelco', origin: 'Philippines', moq: '25 kg', docs: 'COA, Halal', status: 'Active' },
  { id: 'p10', name: 'Citric Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'RZBC', origin: 'China', moq: '500 kg', docs: 'COA, MSDS', status: 'Active' },
  { id: 'p11', name: 'CLM (Citric / Lactic / Malic)', category: 'Lactic Acid & Lactates', supplier: 'Jungbunzlauer', origin: 'Austria', moq: '50 kg', docs: 'COA', status: 'Active' },
  { id: 'p12', name: 'Di Propylene Glycol (D.P.G.)', category: 'Humectant', supplier: 'Dow', origin: 'Singapore', moq: '200 kg', docs: 'COA, MSDS', status: 'Active' },
  { id: 'p13', name: 'DL+ Malic Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'Bartek', origin: 'Canada', moq: '50 kg', docs: 'COA', status: 'Active' },
  { id: 'p14', name: 'DL+ Tartaric Acid', category: 'Acidity Regulators / Anti Oxidants', supplier: 'Caviro', origin: 'Italy', moq: '50 kg', docs: 'COA', status: 'Active' },
  { id: 'p15', name: 'Ethyl Vanillin', category: 'Flavour Enhancer', supplier: 'Solvay', origin: 'France', moq: '5 kg', docs: 'COA, Kosher', status: 'Active' },
  { id: 'p16', name: 'Guar Gum', category: 'Thickener and Stabilizer', supplier: 'Vikas WSP', origin: 'India', moq: '25 kg', docs: 'COA', status: 'Active' },
  { id: 'p17', name: 'Potassium Sorbate', category: 'Preservatives', supplier: 'Niacet', origin: 'Netherlands', moq: '25 kg', docs: 'COA, Halal', status: 'Active' },
  { id: 'p18', name: 'Sodium Benzoate', category: 'Preservatives', supplier: 'Emerald Kalama', origin: 'USA', moq: '50 kg', docs: 'COA', status: 'Active' },
  { id: 'p19', name: 'Xanthan Gum', category: 'Thickener and Stabilizer', supplier: 'CP Kelco', origin: 'China', moq: '25 kg', docs: 'COA, Halal, Kosher', status: 'Active' },
  { id: 'p20', name: 'Sodium Citrate', category: 'Acidity Regulators / Anti Oxidants', supplier: 'Jungbunzlauer', origin: 'Austria', moq: '50 kg', docs: 'COA', status: 'Active' },
]

export const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Sample Sent',
  'Quotation Sent',
  'Negotiation',
  'Converted Customer',
]

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
  { id: 'c1', code: 'CUST-0001', company: 'Patel Agro Industries', contact: 'Bhavesh Patel', city: 'Rajkot', gst: '24AABCP1234F1Z5', industry: 'Snacks', application: 'Extruded Snacks', products: ['Citric Acid', 'Sodium Benzoate'], qty: '2.4 MT/mo', added: '2026-03-12' },
  { id: 'c2', code: 'CUST-0002', company: 'Himalaya Dairy Co.', contact: 'Neha Thakur', city: 'Chandigarh', gst: '04AACFH5678G1Z2', industry: 'Dairy', application: 'Flavoured Milk', products: ['Carrageenan', 'Calcium Lactate'], qty: '1.1 MT/mo', added: '2026-04-02' },
  { id: 'c3', code: 'CUST-0003', company: 'Vitalia Beverages Ltd', contact: 'Arjun Khanna', city: 'Gurugram', gst: '06AADCV4321H1Z9', industry: 'Beverages', application: 'Diet Soda', products: ['Acesulfame-K', 'Aspartame'], qty: '3.0 MT/mo', added: '2026-04-20' },
]

export const seedSamples = [
  { id: 's1', code: 'SMP-1042', company: 'Greenleaf Organics', contact: 'Tara Bose', products: ['Xanthan Gum'], qty: '500 g', sent: '2026-06-20', tracking: 'BLR4471829IN', status: 'Delivered' },
  { id: 's2', code: 'SMP-1043', company: 'Vedant Dairy Solutions', contact: 'Rajiv Suri', products: ['Calcium Lactate', 'Carrageenan'], qty: '1 kg', sent: '2026-06-22', tracking: 'BLR4471955IN', status: 'In Transit' },
  { id: 's3', code: 'SMP-1044', company: 'Sunrise Beverages', contact: 'Komal Iyer', products: ['Sodium Citrate'], qty: '250 g', sent: '2026-06-24', tracking: '—', status: 'Preparing' },
]

export const seedQuotations = [
  { id: 'q1', quoteNo: 'QT-2026-0118', company: 'Sunrise Beverages', items: 2, total: 312000, validUntil: '2026-07-15', status: 'Sent' },
  { id: 'q2', quoteNo: 'QT-2026-0119', company: 'Devansh Foods Pvt Ltd', items: 2, total: 480000, validUntil: '2026-07-10', status: 'Under Negotiation' },
]

export const seedOrders = [
  { id: 'o1', orderNo: 'ORD-2026-0301', company: 'Patel Agro Industries', warehouse: 'Mumbai – Bhiwandi', orderDate: '2026-06-10', delivery: '2026-06-18', total: 186500, status: 'Delivered', payment: 'Paid' },
  { id: 'o2', orderNo: 'ORD-2026-0302', company: 'Himalaya Dairy Co.', warehouse: 'Delhi – Bhiwadi', orderDate: '2026-06-21', delivery: '2026-06-29', total: 94200, status: 'Dispatched', payment: 'Pending' },
]

export const seedFollowUps = [
  { id: 'f1', date: '2026-06-28', type: 'Call', lead: 'Greenleaf Organics', contact: 'Tara Bose', notes: 'Confirm sample feedback on Xanthan Gum viscosity', status: 'Upcoming' },
  { id: 'f2', date: '2026-06-29', type: 'Meeting', lead: 'Devansh Foods Pvt Ltd', contact: 'Anand Mehta', notes: 'Final price negotiation — site visit requested', status: 'Today' },
  { id: 'f3', date: '2026-06-25', type: 'Email', lead: 'Northern Spice Co.', contact: 'Harpreet Saini', notes: 'Sent product catalogue + MOQ sheet', status: 'Completed' },
  { id: 'f4', date: '2026-06-24', type: 'Call', lead: 'Madhuram Snacks', contact: 'Priya Nambiar', notes: 'No answer, retry tomorrow', status: 'Overdue' },
]
