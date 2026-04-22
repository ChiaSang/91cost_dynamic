import {
  Area,
  CartesianGrid,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const data = [
  { month: '1月', energy: 320, air: 68 },
  { month: '2月', energy: 280, air: 72 },
  { month: '3月', energy: 250, air: 78 },
  { month: '4月', energy: 200, air: 85 },
  { month: '5月', energy: 260, air: 82 },
  { month: '6月', energy: 380, air: 70 },
  { month: '7月', energy: 450, air: 65 },
  { month: '8月', energy: 420, air: 63 },
  { month: '9月', energy: 340, air: 75 },
  { month: '10月', energy: 280, air: 80 },
  { month: '11月', energy: 310, air: 73 },
  { month: '12月', energy: 390, air: 67 },
];

export default function AreaChartCard() {
  return (
    <div className='flex h-full flex-col'>
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h3 className='text-xl font-bold text-slate-800'>能耗与空气趋势</h3>
          <p className='mt-1 text-sm text-slate-500'>全年家庭用能与空气质量变化</p>
        </div>
        <div className='flex items-center gap-4 text-xs'>
          <span className='flex items-center gap-1.5'>
            <span className='inline-block h-2.5 w-2.5 rounded-full bg-blue-500' />
            能耗 (kWh)
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='inline-block h-2.5 w-2.5 rounded-full bg-cyan-500' />
            空气质量指数
          </span>
        </div>
      </div>
      <div className='min-h-[260px] flex-1'>
        <ResponsiveContainer width='100%' height='100%'>
          <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id='gradientEnergy' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#3b82f6' stopOpacity={0.3} />
                <stop offset='100%' stopColor='#3b82f6' stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id='gradientAir' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#06b6d4' stopOpacity={0.3} />
                <stop offset='100%' stopColor='#06b6d4' stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' vertical={false} />
            <XAxis dataKey='month' axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.96)',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                fontSize: 13,
              }}
              labelStyle={{ fontWeight: 600, color: '#334155' }}
            />
            <Area
              type='monotone'
              dataKey='energy'
              stroke='#3b82f6'
              strokeWidth={2.5}
              fill='url(#gradientEnergy)'
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
            />
            <Area
              type='monotone'
              dataKey='air'
              stroke='#06b6d4'
              strokeWidth={2.5}
              fill='url(#gradientAir)'
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#06b6d4' }}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
