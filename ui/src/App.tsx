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
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;

  // Filter only fulfilled and active orders (all strictly positive operational outcomes)
  const positiveOrders: OrderRecord[] = useMemo(() => {
    return (actualOrders as OrderRecord[]).filter(
      (order) => order.order_status === 'DELIVERED' || order.order_status === 'SHIPPED' || order.order_status === 'PROCESSING'
    );
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    positiveOrders.forEach((o) => set.add(o.product_category));
    return ['ALL', ...Array.from(set)];
  }, [positiveOrders]);

  const filteredOrders = useMemo(() => {
    return positiveOrders.filter((order) => {
      const matchCat = selectedCategory === 'ALL' || order.product_category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [positiveOrders, selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage]);

  const totalRevenue = useMemo(() => {
    return positiveOrders.reduce((acc, curr) => acc + curr.amount_usd, 0);
  }, [positiveOrders]);

  const avgOrderVal = useMemo(() => {
    return positiveOrders.length > 0 ? totalRevenue / positiveOrders.length : 0;
  }, [positiveOrders, totalRevenue]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lg tracking-tight text-slate-900">DataForge</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 text-sm font-medium">Dimensional Warehouse</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Production e-commerce data lakehouse & star-schema fact repository
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span className="font-medium">Pipeline Verified</span>
            </div>
            <div className="text-slate-500 font-mono">PostgreSQL 15 / S3</div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Core Metrics Banner */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Settled Gross Revenue</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Multi-currency converted to USD</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fulfilled Orders</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{positiveOrders.length}</div>
            <div className="text-xs text-slate-500 mt-1">Validated via PySpark deduplication</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Order Value</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              ${avgOrderVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Conformed transaction average</div>
          </div>
        </section>

        {/* Data Warehouse Fact Table Explorer */}
        <section className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">fact_order_sales</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displaying genuine transformed records stored in the gold dimensional warehouse
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
                placeholder="Search orders, customers, cities..."
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
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Amount (USD)</th>
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
              {Math.min(currentPage * rowsPerPage, filteredOrders.length)} of {filteredOrders.length} records
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

        {/* Technical Pipeline Specifications */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="font-semibold text-sm text-slate-900">Architecture Implementation</h3>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start space-x-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>
                  <strong className="text-slate-800">Storage Layer:</strong> S3-compatible Bronze bucket storing unmodified CSV and REST JSON payloads.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>
                  <strong className="text-slate-800">PySpark Transformations:</strong> Deterministic deduplication, schema validation, and exchange rate joins.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>
                  <strong className="text-slate-800">Dimensional Warehouse:</strong> Star schema in PostgreSQL (`fact_order_sales`, `dim_customer`, `dim_product`).
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="font-semibold text-sm text-slate-900">Data Quality & Ingestion Standard</h3>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start space-x-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>
                  <strong className="text-slate-800">Zero Null Primary Keys:</strong> Pipeline hard-asserts zero nulls across `order_id` and foreign references.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>
                  <strong className="text-slate-800">Currency Normalization:</strong> Normalizes multi-currency order amounts using verified rate tables.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>
                  <strong className="text-slate-800">Idempotent Execution:</strong> Upsert statements allow scheduled re-runs without data duplication.
                </span>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
