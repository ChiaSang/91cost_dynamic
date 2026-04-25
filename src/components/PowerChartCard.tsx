import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  time: string;
  power: number;
}

interface GrafanaFrame {
  schema?: {
    fields?: Array<{
      name: string;
      type: string;
      config?: { displayName?: string };
      labels?: Record<string, string>;
    }>;
  };
  data?: {
    values?: Array<Array<number | string | null>>;
  };
}

interface GrafanaResponse {
  results?: Array<{
    frames?: GrafanaFrame[];
  }>;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type TimeRange = '24h' | '7d' | '30d';

const TIME_RANGES: Record<TimeRange, { label: string; from: () => number }> = {
  '24h': {
    label: '24小时',
    from: () => Date.now() - 24 * 3600 * 1000,
  },
  '7d': {
    label: '7天',
    from: () => Date.now() - 7 * 24 * 3600 * 1000,
  },
  '30d': {
    label: '30天',
    from: () => Date.now() - 30 * 24 * 3600 * 1000,
  },
};

export default function PowerChartCard() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const now = Date.now();
        const from = TIME_RANGES[timeRange].from();

        // Determine aggregation window based on time range
        let intervalMs = 60000; // 1 minute
        if (timeRange === '7d') intervalMs = 600000; // 10 minutes
        if (timeRange === '30d') intervalMs = 3600000; // 1 hour

        const windowPeriod = `every: ${Math.max(1, Math.round(intervalMs / 1000))}s`;

        const body = {
          queries: [
            {
              alias: 'Power',
              datasource: {
                type: 'influxdb',
                uid: 'fdotvxo814zy8a',
              },
              groupBy: [
                { params: ['$__interval'], type: 'time' },
                { params: ['previous'], type: 'fill' },
              ],
              measurement: 'device_data',
              orderByTime: 'ASC',
              policy: 'default',
              query: `from(bucket: "ZHUOHU")\n  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)\n  |> filter(fn: (r) => r["_measurement"] == "device_data")\n  |> filter(fn: (r) => r["_field"] == "P_value")\n  |> filter(fn: (r) => r["did"] == "WX3E3FJFOYh18XmlJfDMHH")\n  |> aggregateWindow(${windowPeriod}, fn: mean, createEmpty: false)\n  |> map(fn: (r) => ({ r with display_name: r._field }))\n  |> yield(name: "mean")`,
              refId: 'A',
              resultFormat: 'time_series',
              select: [
                [
                  { params: ['P_value'], type: 'field' },
                  { params: [], type: 'mean' },
                ],
              ],
              tags: [],
              tz: 'Asia/Shanghai',
              datasourceId: 1,
              intervalMs,
              maxDataPoints: 700,
            },
          ],
          from: String(from),
          to: String(now),
        };

        const res = await fetch('https://gra.91cost.cn/api/ds/query?ds_type=influxdb', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`请求失败: ${res.status}`);
        }

        const json: GrafanaResponse = await res.json();

        // Parse Grafana response frames
        const points: DataPoint[] = [];
        if (json.results) {
          for (const result of json.results) {
            if (!result.frames) continue;
            for (const frame of result.frames) {
              if (!frame.data?.values || !frame.schema?.fields) continue;

              const fields = frame.schema.fields;
              const values = frame.data.values;

              // Find time field index and value field index
              let timeIdx = -1;
              let valueIdx = -1;
              for (let i = 0; i < fields.length; i++) {
                if (fields[i].type === 'time' && timeIdx === -1) {
                  timeIdx = i;
                }
                if ((fields[i].name === 'P_value' || fields[i].type === 'number') && valueIdx === -1) {
                  valueIdx = i;
                }
              }

              if (timeIdx === -1 || valueIdx === -1) continue;

              const timeArr = values[timeIdx];
              const valArr = values[valueIdx];

              for (let j = 0; j < timeArr.length; j++) {
                const ts = Number(timeArr[j]);
                const val = valArr[j] !== null ? Number(valArr[j]) : 0;
                points.push({
                  time: formatTime(ts),
                  power: Math.round(val * 100) / 100,
                });
              }
            }
          }
        }

        if (!cancelled) {
          setData(points);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '数据获取失败';
        if (!cancelled) {
          setError(msg);
          // Fallback to mock data
          setData(generateMockData(timeRange));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const stats = useMemo(() => {
    if (data.length === 0) return { current: 0, avg: 0, max: 0, min: 0 };
    const powers = data.map(d => d.power);
    return {
      current: powers[powers.length - 1],
      avg: Math.round((powers.reduce((a, b) => a + b, 0) / powers.length) * 100) / 100,
      max: Math.max(...powers),
      min: Math.min(...powers),
    };
  }, [data]);

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h3 className='text-xl font-bold text-slate-800 dark:text-white'>实时功率监测</h3>
          <p className='mt-1 text-sm text-slate-500 dark:text-gray-400'>设备功率 (W) 随时间变化趋势</p>
        </div>
        <div className='flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-600 dark:bg-slate-700'>
          {(Object.entries(TIME_RANGES) as [TimeRange, (typeof TIME_RANGES)[TimeRange]][]).map(([key, val]) => (
            <button
              key={key}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                timeRange === key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              onClick={() => setTimeRange(key)}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className='mb-4 grid grid-cols-4 gap-3'>
        <div className='rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30'>
          <div className='text-xs text-blue-600 dark:text-blue-400'>当前功率</div>
          <div className='mt-1 text-lg font-semibold text-blue-700 dark:text-blue-300'>
            {stats.current.toFixed(1)} <span className='text-xs font-normal'>W</span>
          </div>
        </div>
        <div className='rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50'>
          <div className='text-xs text-slate-500 dark:text-gray-400'>平均功率</div>
          <div className='mt-1 text-lg font-semibold text-slate-700 dark:text-gray-200'>
            {stats.avg.toFixed(1)} <span className='text-xs font-normal'>W</span>
          </div>
        </div>
        <div className='rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/30'>
          <div className='text-xs text-emerald-600 dark:text-emerald-400'>最低功率</div>
          <div className='mt-1 text-lg font-semibold text-emerald-700 dark:text-emerald-300'>
            {stats.min.toFixed(1)} <span className='text-xs font-normal'>W</span>
          </div>
        </div>
        <div className='rounded-lg bg-amber-50 p-3 dark:bg-amber-900/30'>
          <div className='text-xs text-amber-600 dark:text-amber-400'>最高功率</div>
          <div className='mt-1 text-lg font-semibold text-amber-700 dark:text-amber-300'>
            {stats.max.toFixed(1)} <span className='text-xs font-normal'>W</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className='min-h-65 flex-1'>
        {loading ? (
          <div className='flex h-full items-center justify-center'>
            <div className='flex flex-col items-center gap-3'>
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400' />
              <span className='text-sm text-slate-400 dark:text-gray-500'>加载功率数据...</span>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id='gradientPower' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#3b82f6' stopOpacity={0.35} />
                  <stop offset='100%' stopColor='#3b82f6' stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='#e2e8f0'
                vertical={false}
                className='dark:stroke-slate-700'
              />
              <XAxis
                dataKey='time'
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval='preserveStartEnd'
                className='dark:fill-gray-400'
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                unit='W'
                className='dark:fill-gray-400'
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.96)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  fontSize: 13,
                }}
                labelStyle={{ fontWeight: 600, color: '#334155' }}
                formatter={(value: unknown) => [`${Number(value).toFixed(1)} W`, '功率']}
              />
              <Area
                type='monotone'
                dataKey='power'
                stroke='#3b82f6'
                strokeWidth={2}
                fill='url(#gradientPower)'
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
              />
            </RechartsAreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      {error && (
        <div className='mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'>
          提示: 使用模拟数据展示 ({error})
        </div>
      )}
    </div>
  );
}

function generateMockData(range: TimeRange): DataPoint[] {
  const now = Date.now();
  const count = range === '24h' ? 144 : range === '7d' ? 168 : 360;
  const stepMs = range === '24h' ? 600000 : range === '7d' ? 3600000 : 7200000;

  const points: DataPoint[] = [];
  let base = 50 + Math.random() * 100;

  for (let i = 0; i < count; i++) {
    const ts = now - (count - i) * stepMs;
    // Simulate power consumption pattern: higher during day, lower at night
    const hour = new Date(ts).getHours();
    const dayFactor =
      hour >= 8 && hour <= 22 ? 1.2 + Math.sin(((hour - 8) / 14) * Math.PI) * 0.6 : 0.4 + Math.random() * 0.3;

    base = base * 0.92 + (80 + Math.random() * 200) * 0.08;
    const power = Math.round(base * dayFactor * 10) / 10;

    points.push({
      time: formatTime(ts),
      power,
    });
  }

  return points;
}
