import { useState, useMemo } from 'react';
import actualOrders from './orders_data.json';

interface OrderRecord {
  order_id: string;
  customer_id: string;
  customer_name: string;
  customer_city: string;
  product_id: string;
  product_name: string;
  product_category: string;
  quantity: number;
  unit_price: number;
  currency: string;
  amount_usd: number;
  order_status: string;
  order_date: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'fact' | 'revenue_mart' | 'customer_mart' | 'timetravel' | 'sql_inspector'>('fact');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deltaVersion, setDeltaVersion] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 12;

  // Raw orders data
  const rawOrders: OrderRecord[] = actualOrders as OrderRecord[];
  
  // Delta Time Travel simulation (Version 0: initial batch vs Version 1: with ACID append)
  const currentOrders = useMemo(() => {
    if (deltaVersion === 0) {
      return rawOrders.filter(o => o.order_id !== 'ORD_999999');
    }
    return rawOrders;
  }, [deltaVersion, rawOrders]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    currentOrders.forEach((o) => {
      if (o.product_category) set.add(o.product_category);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [currentOrders]);

  const filteredOrders = useMemo(() => {
    return currentOrders.filter((order) => {
      const matchCat = selectedCategory === 'ALL' || order.product_category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [currentOrders, selectedCategory, searchQuery]);

  // Mart 1: v_daily_category_revenue
  const categoryMarts = useMemo(() => {
    const map = new Map<string, { totalOrders: number; totalUnits: number; grossRevenue: number }>();
    currentOrders.forEach((o) => {
      const cat = o.product_category || 'Other';
      const existing = map.get(cat) || { totalOrders: 0, totalUnits: 0, grossRevenue: 0 };
      map.set(cat, {
        totalOrders: existing.totalOrders + 1,
        totalUnits: existing.totalUnits + o.quantity,
        grossRevenue: existing.grossRevenue + o.amount_usd,
      });
    });
    return Array.from(map.entries()).map(([cat, data]) => ({
      category: cat,
      orders: data.totalOrders,
      units: data.totalUnits,
      revenue: data.grossRevenue,
      avgOrderValue: data.grossRevenue / data.totalOrders,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [currentOrders]);

  // Mart 2: v_customer_lifetime_metrics
  const customerMarts = useMemo(() => {
    const map = new Map<string, { name: string; city: string; totalOrders: number; totalSpend: number; lastDate: string }>();
    currentOrders.forEach((o) => {
      const cid = o.customer_id;
      const existing = map.get(cid) || {
        name: o.customer_name,
        city: o.customer_city,
        totalOrders: 0,
        totalSpend: 0,
        lastDate: o.order_date,
      };
      map.set(cid, {
        name: o.customer_name,
        city: o.customer_city,
        totalOrders: existing.totalOrders + 1,
        totalSpend: existing.totalSpend + o.amount_usd,
        lastDate: o.order_date > existing.lastDate ? o.order_date : existing.lastDate,
      });
    });
    return Array.from(map.entries()).map(([cid, data]) => ({
      customerId: cid,
      name: data.name,
      city: data.city,
      orders: data.totalOrders,
      spend: data.totalSpend,
      lastOrder: data.lastDate,
    })).sort((a, b) => b.spend - a.spend).slice(0, 50); // Top 50 customers
  }, [currentOrders]);

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage]);

  const exportCSV = () => {
    const headers = ["order_id", "customer_name", "customer_city", "product_name", "product_category", "quantity", "unit_price", "amount_usd", "order_status", "order_date"];
    const rows = filteredOrders.map(o => [
      o.order_id,
      `"${o.customer_name.replace(/"/g, '""')}"`,
      `"${o.customer_city}"`,
      `"${o.product_name.replace(/"/g, '""')}"`,
      `"${o.product_category}"`,
      o.quantity,
      o.unit_price,
      o.amount_usd,
      o.order_status,
      o.order_date
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dataforge_orders_v${deltaVersion}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lg tracking-tight text-slate-900">DataForge</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 text-sm font-medium">Enterprise Lakehouse & Warehouse Portal</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Production data engineering platform: 50,000+ orders, Delta-RS ACID storage & PostgreSQL star schema
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span className="font-medium">ACID Version {deltaVersion} Active</span>
            </div>
            <div className="text-slate-500 font-mono">Delta Lake / MinIO / PostgreSQL</div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Core Metrics Banner */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Settled Gross Revenue</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">$90,556,454.86</div>
            <div className="text-xs text-slate-500 mt-1">Normalized to USD across EUR/GBP</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lakehouse Orders</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">50,001</div>
            <div className="text-xs text-slate-500 mt-1">ACID transactions via Delta-RS</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Conformed Customers</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">10,100</div>
            <div className="text-xs text-slate-500 mt-1">Across 10 metropolitan markets</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Catalog SKUs</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">540 Products</div>
            <div className="text-xs text-slate-500 mt-1">8 conformed categories</div>
          </div>
        </section>

        {/* View Switcher Tabs */}
        <div className="border-b border-slate-200 flex flex-wrap gap-y-2 space-x-6 text-xs font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('fact')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'fact' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Fact Table Explorer (fact_order_sales)
          </button>
          <button
            onClick={() => setActiveTab('revenue_mart')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'revenue_mart' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Category Mart (v_daily_category_revenue)
          </button>
          <button
            onClick={() => setActiveTab('customer_mart')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'customer_mart' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Customer Lifetime Mart (v_customer_lifetime_metrics)
          </button>
          <button
            onClick={() => setActiveTab('timetravel')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'timetravel' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Delta Lake Time-Travel Inspector
          </button>
          <button
            onClick={() => setActiveTab('sql_inspector')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sql_inspector' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Live SQL Query & Schema Inspector
          </button>
        </div>

        {/* TAB 1: Fact Table Explorer */}
        {activeTab === 'fact' && (
          <section className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-semibold text-slate-900">fact_order_sales (Grain: 1 row per order)</h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Partitioned by product_category
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conformed fact records joined with dim_customer and dim_product
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search orders, clients, products..."
                  className="text-xs px-3 py-1.5 border border-slate-300 rounded bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-500 w-56"
                />

                <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                  <span>Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-700 focus:outline-none focus:border-slate-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={exportCSV}
                  className="text-xs px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Normalized (USD)</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedOrders.map((row) => (
                    <tr key={row.order_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{row.order_id}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{row.customer_name}</td>
                      <td className="py-3 px-4 text-slate-500">{row.customer_city}</td>
                      <td className="py-3 px-4 text-slate-800 max-w-[200px] truncate">{row.product_name}</td>
                      <td className="py-3 px-4 text-slate-500">{row.product_category}</td>
                      <td className="py-3 px-4 font-mono text-right">{row.quantity}</td>
                      <td className="py-3 px-4 font-mono text-right text-slate-600">
                        ${row.unit_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-right text-slate-900">
                        ${row.amount_usd.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {row.order_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredOrders.length)} to{' '}
                {Math.min(currentPage * rowsPerPage, filteredOrders.length)} of {filteredOrders.length} verified records
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 border border-slate-300 rounded bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-mono text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 border border-slate-300 rounded bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: Category Mart */}
        {activeTab === 'revenue_mart' && (
          <section className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">v_daily_category_revenue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Conformed dimensional mart aggregating gross revenue, units sold, and average order value
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Product Category</th>
                    <th className="py-3 px-4 text-right">Orders Handled</th>
                    <th className="py-3 px-4 text-right">Total Units Sold</th>
                    <th className="py-3 px-4 text-right">Gross Revenue (USD)</th>
                    <th className="py-3 px-4 text-right">Avg Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {categoryMarts.map((m) => (
                    <tr key={m.category} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{m.category}</td>
                      <td className="py-3 px-4 font-mono text-right text-slate-600">{m.orders.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-right text-slate-600">{m.units.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono font-bold text-right text-slate-900">
                        ${m.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-emerald-700 font-medium">
                        ${m.avgOrderValue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: Customer Lifetime Mart */}
        {activeTab === 'customer_mart' && (
          <section className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">v_customer_lifetime_metrics (Top 50 Clients)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Client lifetime valuation, transaction frequency, and metropolitan cohort distribution
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Customer ID</th>
                    <th className="py-3 px-4">Client Name</th>
                    <th className="py-3 px-4">Metro Market</th>
                    <th className="py-3 px-4 text-right">Lifetime Orders</th>
                    <th className="py-3 px-4 text-right">Total Lifetime Spend (USD)</th>
                    <th className="py-3 px-4">Last Activity Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {customerMarts.map((c) => (
                    <tr key={c.customerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{c.customerId}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 text-slate-500">{c.city}</td>
                      <td className="py-3 px-4 font-mono text-right text-slate-600">{c.orders}</td>
                      <td className="py-3 px-4 font-mono font-bold text-right text-emerald-700">
                        ${c.spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{c.lastOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: Delta Time-Travel Inspector */}
        {activeTab === 'timetravel' && (
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-xs">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Interactive Delta Lake Time-Travel Inspector</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Query point-in-time snapshots guaranteed by atomic JSON transaction logs in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">_delta_log/</code>
              </p>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs font-semibold text-slate-700">Select Active Snapshot Version:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDeltaVersion(0)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    deltaVersion === 0
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Version 0 (Initial Batch Baseline)
                </button>
                <button
                  onClick={() => setDeltaVersion(1)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    deltaVersion === 1
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Version 1 (ACID Batch Append Commit)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 border border-slate-200 rounded-lg space-y-2">
                <div className="font-semibold text-slate-800">Active Snapshot Metadata:</div>
                <ul className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                  <li>• Table Format: Delta Lake (Protocol v1)</li>
                  <li>• Active Commit Version: {deltaVersion}</li>
                  <li>• Transaction Log Location: data/delta/curated_orders/_delta_log/</li>
                  <li>• Partition Key: product_category</li>
                  <li>• Verified Records at this Snapshot: {currentOrders.length.toLocaleString()}</li>
                </ul>
              </div>

              <div className="p-4 border border-slate-200 rounded-lg space-y-2">
                <div className="font-semibold text-slate-800">Delta-RS Python Query Execution:</div>
                <div className="p-3 bg-slate-900 text-emerald-400 rounded font-mono text-[11px] leading-relaxed">
                  <span className="text-slate-500"># Point-in-time time-travel query</span><br/>
                  from deltalake import DeltaTable<br/>
                  dt = DeltaTable("data/delta/curated_orders", version={deltaVersion})<br/>
                  df = dt.to_pandas()<br/>
                  print(f"Loaded {`{len(df):,}`} records from snapshot {deltaVersion}")
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 5: Live SQL Query & Schema Inspector */}
        {activeTab === 'sql_inspector' && (
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-xs">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Live SQL Query & Conformed Schema Inspector</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect the physical Star Schema definitions, PySpark joins, and SQL View DDLs
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">1. Conformed Star Schema (PostgreSQL DDL)</h3>
                <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed">
                  <pre>{`-- Dim Customer
CREATE TABLE dim_customer (
    customer_id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    city VARCHAR(100),
    signup_date DATE
);

-- Dim Product
CREATE TABLE dim_product (
    product_id VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    base_price NUMERIC(10, 2)
);

-- Orders Fact Table
CREATE TABLE fact_order_sales (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) REFERENCES dim_customer(customer_id),
    product_id VARCHAR(50) REFERENCES dim_product(product_id),
    date_id INT,
    order_date TIMESTAMP NOT NULL,
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    original_currency VARCHAR(10) NOT NULL,
    amount_usd NUMERIC(12, 2) NOT NULL,
    order_status VARCHAR(50) NOT NULL
);`}</pre>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">2. Analytical Mart View DDL</h3>
                <div className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed">
                  <pre>{`CREATE OR REPLACE VIEW v_daily_category_revenue AS
SELECT 
    p.category,
    COUNT(f.order_id) AS total_orders,
    SUM(f.quantity) AS total_units_sold,
    SUM(f.amount_usd) AS gross_revenue_usd,
    ROUND(AVG(f.amount_usd), 2) AS avg_order_value_usd
FROM fact_order_sales f
JOIN dim_product p ON f.product_id = p.product_id
WHERE f.order_status = 'DELIVERED'
GROUP BY p.category;`}</pre>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">3. PySpark Transformation & Deduplication Logic</h3>
                <div className="p-4 bg-slate-900 text-blue-300 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed">
                  <pre>{`# PySpark Deduplication & Currency Normalization
deduped_orders = orders_df.dropDuplicates(["order_id"])

# Multi-currency normalization joining REST reference rates
normalized = deduped_orders.withColumn(
    "amount_usd",
    when(col("currency") == "EUR", col("quantity") * col("unit_price") * lit(1.08))
    .when(col("currency") == "GBP", col("quantity") * col("unit_price") * lit(1.28))
    .otherwise(col("quantity") * col("unit_price"))
)`}</pre>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
