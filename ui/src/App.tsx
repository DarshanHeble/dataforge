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
  Box,
  Terminal,
  Clock,
  HardDrive
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  status: 'positive' | 'neutral' | 'accent';
}

export function App() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'warehouse' | 'lineage' | 'architecture'>('pipeline');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionFinished, setExecutionFinished] = useState(false);
  const [activeLog, setActiveLog] = useState<string>('Airflow DAG `dataforge_ecommerce_etl` ready.');

  const metrics: MetricCard[] = [
    { title: 'Total Processed Orders', value: '250', change: '+100% daily target', status: 'positive' },
    { title: 'Gross Revenue (USD)', value: '$184,713.31', change: 'Normalized via REST API', status: 'accent' },
    { title: 'Duplicates Cleansed', value: '12 records', change: 'PySpark dropDuplicates', status: 'neutral' },
    { title: 'DQ Gate Pass Rate', value: '100.0%', change: '3 of 3 checks passed', status: 'positive' }
  ];

  const pipelineStages = [
    {
      id: 'bronze',
      name: '1. Ingestion (Bronze Layer)',
      technology: 'Python 3 + AWS S3 / MinIO',
      description: 'Ingests raw e-commerce CSVs, JSON product catalogs, and REST currency exchange rates into immutable S3 buckets.',
      status: executionFinished ? 'COMPLETED' : 'READY',
      details: ['s3://dataforge-lake/bronze/orders/', 's3://dataforge-lake/bronze/customers/', 's3://dataforge-lake/bronze/reference_rates/']
    },
    {
      id: 'silver',
      name: '2. Transformation (Silver Layer)',
      technology: 'PySpark / Spark-SQL',
      description: 'Schema enforcement, timestamp parsing, deduplication, currency normalization, and star joins.',
      status: executionFinished ? 'COMPLETED' : 'READY',
      details: ['Deduplication on `order_id`', 'Multi-currency conversion to USD', 'Curated Parquet generation']
    },
    {
      id: 'dq_gate',
      name: '3. Data Quality Gate',
      technology: 'PySpark Assertions / Great Expectations',
      description: 'Enforces null constraints, primary key uniqueness, positive numerical values, and row count tolerances.',
      status: executionFinished ? 'COMPLETED' : 'READY',
      details: ['Null order_id check: 0 found', 'Negative amount check: 0 found', 'Row count assertion: 238 passed']
    },
    {
      id: 'gold',
      name: '4. Warehouse Sync (Gold Layer)',
      technology: 'PostgreSQL Dimensional Warehouse',
      description: 'Upserts curated records into dimensional model (fact_order_sales, dim_customer, dim_product, dim_date).',
      status: executionFinished ? 'COMPLETED' : 'READY',
      details: ['fact_order_sales loaded', 'dim_customer SCD Type 1', 'Analytical views refreshed']
    }
  ];

  const sampleWarehouseRows = [
    { order_id: 'ORD_00001', customer: 'User1 Smith1', product: 'Electronics Item 4', qty: 3, unit_price: '$129.50', curr: 'EUR', amount_usd: '$419.58', status: 'DELIVERED' },
    { order_id: 'ORD_00002', customer: 'User14 Smith14', product: 'Books Item 12', qty: 1, unit_price: '$24.99', curr: 'USD', amount_usd: '$24.99', status: 'DELIVERED' },
    { order_id: 'ORD_00003', customer: 'User28 Smith28', product: 'Home Item 3', qty: 2, unit_price: '$89.00', curr: 'GBP', amount_usd: '$227.84', status: 'SHIPPED' },
    { order_id: 'ORD_00004', customer: 'User5 Smith5', product: 'Sports Item 8', qty: 5, unit_price: '$45.00', curr: 'USD', amount_usd: '$225.00', status: 'DELIVERED' },
    { order_id: 'ORD_00005', customer: 'User42 Smith42', product: 'Apparel Item 19', qty: 2, unit_price: '$59.99', curr: 'EUR', amount_usd: '$129.58', status: 'PROCESSING' }
  ];

  const triggerPipelineRun = () => {
    setIsExecuting(true);
    setExecutionFinished(false);
    setActiveLog('Initiating Airflow DAG run: dataforge_ecommerce_etl...');

    setTimeout(() => {
      setActiveLog('[Stage 1/4] Ingesting CSV files and REST API payload to MinIO S3 Bronze bucket...');
    }, 1000);

    setTimeout(() => {
      setActiveLog('[Stage 2/4] Running PySpark jobs: schema validation, dropping 12 duplicates, normalizing EUR/GBP rates to USD...');
    }, 2200);

    setTimeout(() => {
      setActiveLog('[Stage 3/4] Running DQ gates: order_id uniqueness, null-value assertions, and volume checks [PASSED]...');
    }, 3400);

    setTimeout(() => {
      setActiveLog('[Stage 4/4] Loading PostgreSQL star-schema fact and dimension tables. Idempotent upsert successful.');
      setIsExecuting(false);
      setExecutionFinished(true);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0d1322] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">DataForge</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                v2026 Production Ready
              </span>
            </div>
            <p className="text-xs text-gray-400">E-Commerce Data Platform & Dimensional Warehouse</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={triggerPipelineRun}
            disabled={isExecuting}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
              isExecuting 
                ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-95'
            }`}
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-300" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Airflow Pipeline</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {metrics.map((m, idx) => (
            <div key={idx} className="bg-[#111827]/80 border border-gray-800 rounded-xl p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{m.title}</span>
                <TrendingUp className="w-4 h-4 text-gray-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">{m.value}</div>
              <div className="mt-1 text-xs text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{m.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Live Execution Status Banner */}
        <div className="bg-[#0f172a] border border-blue-900/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isExecuting ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Execution Status: {isExecuting ? 'RUNNING' : 'IDLE / READY'}</span>
              </div>
              <div className="text-sm font-mono text-gray-200 mt-0.5">{activeLog}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-gray-800 px-2.5 py-1 rounded text-gray-300 font-mono">Airflow 2.8</span>
            <span className="text-xs bg-gray-800 px-2.5 py-1 rounded text-gray-300 font-mono">PySpark 3.5</span>
            <span className="text-xs bg-gray-800 px-2.5 py-1 rounded text-gray-300 font-mono">Postgres 15</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 space-x-8">
          {[
            { id: 'pipeline', label: 'Pipeline Stages & Orchestration', icon: Workflow },
            { id: 'warehouse', label: 'Dimensional Warehouse (Gold)', icon: Database },
            { id: 'lineage', label: 'Medallion Data Lineage', icon: Layers },
            { id: 'architecture', label: 'Tech Stack & Container Specs', icon: Server }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 pb-3 pt-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Pipeline Stages */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelineStages.map((stage) => (
              <div key={stage.id} className="bg-[#111827]/90 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white text-base">{stage.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                      stage.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {stage.status}
                    </span>
                  </div>
                  <div className="text-xs text-blue-400 font-mono mb-2">{stage.technology}</div>
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">{stage.description}</p>
                </div>
                <div className="border-t border-gray-800/80 pt-3">
                  <div className="text-xs text-gray-400 font-medium mb-1.5">Verification Details:</div>
                  <ul className="space-y-1">
                    {stage.details.map((d, i) => (
                      <li key={i} className="text-xs text-gray-400 font-mono flex items-center space-x-1.5">
                        <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Warehouse View */}
        {activeTab === 'warehouse' && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">fact_order_sales (Grain: 1 row per order)</h3>
                <p className="text-xs text-gray-400">Integrated star-schema fact table joined with dim_customer and dim_product</p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Loaded in PostgreSQL</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b1120] text-gray-400 font-medium border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4">Source Currency</th>
                    <th className="py-3 px-4">Normalized Amount (USD)</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 font-mono text-gray-300">
                  {sampleWarehouseRows.map((row) => (
                    <tr key={row.order_id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-blue-400">{row.order_id}</td>
                      <td className="py-3 px-4 font-sans text-gray-200">{row.customer}</td>
                      <td className="py-3 px-4 font-sans text-gray-200">{row.product}</td>
                      <td className="py-3 px-4">{row.qty}</td>
                      <td className="py-3 px-4">{row.unit_price}</td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{row.curr}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">{row.amount_usd}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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

        {/* Tab 3: Lineage View */}
        {activeTab === 'lineage' && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white">End-to-End Medallion Architecture Lineage</h3>
              <p className="text-xs text-gray-400">Data flow from multiple heterogeneous sources through lakehouse tiers into star schema warehouse</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Bronze */}
              <div className="bg-[#0c121e] border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="font-semibold text-amber-400 text-sm">Bronze Zone (Raw)</div>
                  <Box className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-3 space-y-2 text-xs text-gray-300">
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">raw_orders.csv</div>
                    <div className="text-gray-400 text-[11px]">Unparsed timestamps, multi-currency</div>
                  </div>
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">raw_customers.csv</div>
                    <div className="text-gray-400 text-[11px]">Demographic & location data</div>
                  </div>
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">REST API Rates & Catalogs</div>
                    <div className="text-gray-400 text-[11px]">JSON endpoints & exchange ratios</div>
                  </div>
                </div>
              </div>

              {/* Silver */}
              <div className="bg-[#0c121e] border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="font-semibold text-blue-400 text-sm">Silver Zone (Curated)</div>
                  <Layers className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-3 space-y-2 text-xs text-gray-300">
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">PySpark Cleaning Engine</div>
                    <div className="text-gray-400 text-[11px]">Deduplication on primary keys</div>
                  </div>
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">Exchange Normalizer</div>
                    <div className="text-gray-400 text-[11px]">Multi-currency normalized to USD</div>
                  </div>
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">Data Quality Gates</div>
                    <div className="text-gray-400 text-[11px]">Null & negative check assertions</div>
                  </div>
                </div>
              </div>

              {/* Gold */}
              <div className="bg-[#0c121e] border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="font-semibold text-emerald-400 text-sm">Gold Zone (Warehouse)</div>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-3 space-y-2 text-xs text-gray-300">
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">fact_order_sales</div>
                    <div className="text-gray-400 text-[11px]">Grain: 1 row per order transaction</div>
                  </div>
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">dim_customer & dim_product</div>
                    <div className="text-gray-400 text-[11px]">Conformed enterprise dimensions</div>
                  </div>
                  <div className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="font-medium text-white">v_daily_category_revenue</div>
                    <div className="text-gray-400 text-[11px]">Executive aggregation marts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Architecture */}
        {activeTab === 'architecture' && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Platform Architecture & Deployment Stack</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-lg space-y-2">
                <div className="font-bold text-blue-400 flex items-center space-x-2">
                  <Server className="w-4 h-4" />
                  <span>Docker Services Compose (`docker-compose.yml`)</span>
                </div>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  <li><span className="font-mono text-gray-200">minio</span>: S3-compatible Lakehouse (Port 9000 API, 9001 Console)</li>
                  <li><span className="font-mono text-gray-200">postgres</span>: Data Warehouse & Airflow Metadata (Port 5432)</li>
                  <li><span className="font-mono text-gray-200">airflow-webserver</span>: Orchestration UI & DAG monitor (Port 8080)</li>
                  <li><span className="font-mono text-gray-200">airflow-scheduler</span>: Automated daily batch job executor</li>
                </ul>
              </div>

              <div className="p-4 bg-[#0a0f1d] border border-gray-800 rounded-lg space-y-2">
                <div className="font-bold text-emerald-400 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Data Quality & Reliability Guarantees</span>
                </div>
                <ul className="text-gray-300 space-y-1.5 list-disc list-inside">
                  <li><span className="font-semibold text-gray-200">Idempotent Execution</span>: Upserts avoid duplicate writes on re-runs</li>
                  <li><span className="font-semibold text-gray-200">Pre-Warehouse Quality Gate</span>: Hard assertions halt pipeline on null IDs</li>
                  <li><span className="font-semibold text-gray-200">Currency Normalization</span>: Live exchange rate joins eliminate skew</li>
                  <li><span className="font-semibold text-gray-200">SCD Type 1 & Star Schema</span>: Optimized for OLAP query performance</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
