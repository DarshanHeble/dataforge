import { useState } from 'react';
import { 
  Database, 
  Workflow, 
  Layers, 
  CheckCircle2, 
  TrendingUp, 
  Server, 
  RefreshCw, 
  Play, 
  Check, 
  ShieldCheck, 
  Clock, 
  SlidersHorizontal,
  DownloadCloud
} from 'lucide-react';

interface MetricItem {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'neutral';
}

export function App() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'warehouse' | 'lineage' | 'infrastructure'>('pipeline');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(true);
  const [stageProgress, setStageProgress] = useState(4);
  const [logText, setLogText] = useState('Airflow DAG dataforge_ecommerce_etl active. Last sync: Successful.');

  const metrics: MetricItem[] = [
    { label: 'Orders Ingested', value: '250', change: '100% daily volume', trend: 'up' },
    { label: 'Gross Revenue (USD)', value: '$184,713.31', change: 'Normalized across EUR/GBP', trend: 'up' },
    { label: 'Deduplicated Records', value: '12 duplicates', change: '0 collisions in warehouse', trend: 'neutral' },
    { label: 'DQ Quality Gate', value: '100% Passed', change: '3 of 3 checks validated', trend: 'up' }
  ];

  const pipelineStages = [
    {
      step: 1,
      title: 'Bronze Ingestion',
      system: 'Python 3 + AWS S3 / MinIO',
      summary: 'Extracts orders CSV, customer profiles, product catalog, and REST API currency rates into immutable raw lake storage.',
      specs: [
        's3://dataforge-lake/bronze/orders/raw_orders.csv',
        's3://dataforge-lake/bronze/reference_rates/rates.json'
      ]
    },
    {
      step: 2,
      title: 'Silver PySpark Transform',
      system: 'Apache Spark / PySpark',
      summary: 'Schema validation, timestamp casting, duplicate eviction on primary keys, and currency conversion to standard USD.',
      specs: [
        'dropDuplicates([order_id]) removed 12 rows',
        'EUR (1.08) & GBP (1.28) normalized to USD'
      ]
    },
    {
      step: 3,
      title: 'Data Quality Gate',
      system: 'Assertion Validation Engine',
      summary: 'Pre-load gate enforcing zero null primary keys, referential integrity, and strictly positive financial amounts.',
      specs: [
        'Zero null order_id constraints confirmed',
        'Amount and price non-negative assertion passed'
      ]
    },
    {
      step: 4,
      title: 'Gold Star-Schema Sync',
      system: 'PostgreSQL Dimensional Warehouse',
      summary: 'Idempotent UPSERT into fact_order_sales, dim_customer, dim_product, and dim_date tables with analytical views.',
      specs: [
        'fact_order_sales populated',
        'v_daily_category_revenue aggregation updated'
      ]
    }
  ];

  const warehouseRows = [
    { id: 'ORD_00001', customer: 'User1 Smith', product: 'Electronics Item 4', qty: 3, price: '$129.50', orig: 'EUR', amount: '$419.58', status: 'DELIVERED', date: '2026-03-12' },
    { id: 'ORD_00002', customer: 'User14 Smith', product: 'Books Item 12', qty: 1, price: '$24.99', orig: 'USD', amount: '$24.99', status: 'DELIVERED', date: '2026-03-12' },
    { id: 'ORD_00003', customer: 'User28 Smith', product: 'Home Item 3', qty: 2, price: '$89.00', orig: 'GBP', amount: '$227.84', status: 'SHIPPED', date: '2026-03-13' },
    { id: 'ORD_00004', customer: 'User5 Smith', product: 'Sports Item 8', qty: 5, price: '$45.00', orig: 'USD', amount: '$225.00', status: 'DELIVERED', date: '2026-03-13' },
    { id: 'ORD_00005', customer: 'User42 Smith', product: 'Apparel Item 19', qty: 2, price: '$59.99', orig: 'EUR', amount: '$129.58', status: 'PROCESSING', date: '2026-03-14' },
    { id: 'ORD_00006', customer: 'User11 Smith', product: 'Electronics Item 1', qty: 1, price: '$349.00', orig: 'USD', amount: '$349.00', status: 'DELIVERED', date: '2026-03-14' },
    { id: 'ORD_00007', customer: 'User63 Smith', product: 'Books Item 7', qty: 4, price: '$18.50', orig: 'GBP', amount: '$94.72', status: 'SHIPPED', date: '2026-03-15' }
  ];

  const filteredWarehouseRows = statusFilter === 'ALL' 
    ? warehouseRows 
    : warehouseRows.filter(r => r.status === statusFilter);

  const runPipelineDemo = () => {
    setIsRunning(true);
    setCompleted(false);
    setStageProgress(1);
    setLogText('Task [1/4] Ingesting CSV files & REST API rates into S3 Bronze bucket...');

    setTimeout(() => {
      setStageProgress(2);
      setLogText('Task [2/4] Executing PySpark cleaning, deduplication, and USD normalization...');
    }, 1200);

    setTimeout(() => {
      setStageProgress(3);
      setLogText('Task [3/4] Data Quality Gate: Verifying null values and integrity assertions...');
    }, 2400);

    setTimeout(() => {
      setStageProgress(4);
      setLogText('Task [4/4] Warehouse sync complete: All fact & dimension tables updated in PostgreSQL.');
      setIsRunning(false);
      setCompleted(true);
    }, 3600);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">DataForge</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500">E-Commerce Lakehouse & Dimensional Warehouse</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={runPipelineDemo}
              disabled={isRunning}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-xs ${
                isRunning
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-98'
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Processing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Trigger Batch Pipeline</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-6 py-6 flex-1 space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{m.label}</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{m.value}</div>
              <div className="mt-1 text-xs text-emerald-600 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{m.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Live Status Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isRunning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">
                Pipeline Run Status: {isRunning ? 'EXECUTING' : 'IDLE / COMPLETED'}
              </div>
              <div className="text-sm font-mono text-slate-800 font-medium mt-0.5">{logText}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
            <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200">Airflow 2.8</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200">PySpark 3.5</span>
            <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200">Postgres 15</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8">
            {[
              { id: 'pipeline', label: 'Pipeline Workflow', icon: Workflow },
              { id: 'warehouse', label: 'Warehouse Tables', icon: Database },
              { id: 'lineage', label: 'Data Architecture', icon: Layers },
              { id: 'infrastructure', label: 'Docker Services', icon: Server }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                    active
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* View 1: Pipeline Workflow */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelineStages.map((stage) => {
              const isCurrent = isRunning && stageProgress === stage.step;
              const isDone = completed || stageProgress > stage.step;

              return (
                <div 
                  key={stage.step}
                  className={`bg-white border rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isCurrent ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                          {stage.step}
                        </span>
                        <h3 className="font-semibold text-slate-900 text-base">{stage.title}</h3>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        isDone 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : isCurrent 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isDone ? 'Completed' : isCurrent ? 'Running' : 'Ready'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-indigo-600 font-medium mb-2">{stage.system}</div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{stage.summary}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="text-xs font-medium text-slate-500 mb-1.5">Verification details:</div>
                    <ul className="space-y-1">
                      {stage.specs.map((item, idx) => (
                        <li key={idx} className="text-xs text-slate-600 font-mono flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View 2: Warehouse Tables */}
        {activeTab === 'warehouse' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">fact_order_sales</h3>
                <p className="text-xs text-slate-500">Conformed star schema fact table loaded in PostgreSQL</p>
              </div>

              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Status Filter:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg text-xs px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="PROCESSING">PROCESSING</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4">Source Currency</th>
                    <th className="py-3 px-4">Normalized (USD)</th>
                    <th className="py-3 px-4">Order Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredWarehouseRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{row.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{row.customer}</td>
                      <td className="py-3 px-4 text-slate-600">{row.product}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{row.date}</td>
                      <td className="py-3 px-4 font-mono">{row.qty}</td>
                      <td className="py-3 px-4 font-mono">{row.price}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {row.orig}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.amount}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          row.status === 'DELIVERED' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.status === 'SHIPPED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View 3: Data Architecture */}
        {activeTab === 'lineage' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Medallion Data Lakehouse Architecture</h3>
              <p className="text-xs text-slate-500">Tiered progression from raw unstructured ingestion to certified dimensional tables</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bronze Tier */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="font-semibold text-slate-900 text-sm">Bronze Layer (Raw)</span>
                    <DownloadCloud className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">raw_orders.csv</div>
                      <div className="text-slate-500 text-[11px]">Multi-currency e-commerce transactions</div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">raw_customers.csv</div>
                      <div className="text-slate-500 text-[11px]">Demographics and registration dates</div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">REST Exchange API</div>
                      <div className="text-slate-500 text-[11px]">JSON endpoints for currency conversion</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 font-mono">Store: AWS S3 / MinIO</div>
              </div>

              {/* Silver Tier */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="font-semibold text-slate-900 text-sm">Silver Layer (Cleaned)</span>
                    <Workflow className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">PySpark Deduplication</div>
                      <div className="text-slate-500 text-[11px]">dropDuplicates on order_id</div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">Currency Normalization</div>
                      <div className="text-slate-500 text-[11px]">Joined with reference rates to USD</div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">Quality Assertions Gate</div>
                      <div className="text-slate-500 text-[11px]">Zero nulls & schema conformance</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 font-mono">Format: Parquet Partitions</div>
              </div>

              {/* Gold Tier */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="font-semibold text-slate-900 text-sm">Gold Layer (Star Schema)</span>
                    <Database className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">fact_order_sales</div>
                      <div className="text-slate-500 text-[11px]">Grain: 1 row per order transaction</div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">dim_customer & dim_product</div>
                      <div className="text-slate-500 text-[11px]">Conformed enterprise dimensions</div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-medium text-slate-900">v_daily_category_revenue</div>
                      <div className="text-slate-500 text-[11px]">Aggregated business metrics view</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 font-mono">Target: PostgreSQL 15</div>
              </div>
            </div>
          </div>
        )}

        {/* View 4: Docker Services */}
        {activeTab === 'infrastructure' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-base">Containerized Infrastructure (Docker Compose)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center space-x-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Configured Services</span>
                </div>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span><strong className="text-slate-800">minio</strong>: S3-Compatible Object Store (Port 9000 / Console 9001)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span><strong className="text-slate-800">postgres</strong>: Star-Schema Warehouse (Port 5433)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span><strong className="text-slate-800">airflow-webserver</strong>: Pipeline UI & DAG Monitor (Port 8080)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span><strong className="text-slate-800">airflow-scheduler</strong>: Automated batch scheduler</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Platform Guarantees</span>
                </div>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span><strong className="text-slate-800">Idempotency:</strong> Safe re-executions via primary key UPSERTs</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span><strong className="text-slate-800">Data Quality:</strong> Automated assertions prevent null keys</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span><strong className="text-slate-800">Normalization:</strong> Multi-currency joins with rate mocks</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span><strong className="text-slate-800">Star Schema:</strong> Sub-second queries on fact & dimensions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
