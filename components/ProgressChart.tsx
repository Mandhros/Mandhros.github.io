import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

interface ProgressChartProps {
  data: any[];
  dataKey: string;
  title: string;
  height?: number;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ data, dataKey, title, height = 300 }) => {
  if (data.length < 2) {
    return (
      <div className="bg-surface p-2 rounded-lg shadow-lg text-center" style={{ height: `${height}px` }}>
         <h3 className="text-md font-semibold text-text-primary mb-2">{title}</h3>
         <div className="flex items-center justify-center h-full">
            <p className="text-text-secondary">Pas assez de données pour afficher un graphique.</p>
         </div>
      </div>
    )
  }

  return (
    <div className="bg-surface p-2 rounded-lg shadow-lg">
      <h3 className="text-md font-semibold text-text-primary mb-2 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af" 
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} 
            />
          <YAxis stroke="#9ca3af" unit="kg" domain={['dataMin - 5', 'dataMax + 5']} allowDecimals={false} />
          <Legend formatter={(value) => value === 'maxWeight' ? 'Poids Max' : 'Volume Total'}/>
          <Line type="monotone" dataKey={dataKey} stroke="#4f46e5" activeDot={{ r: 8 }} strokeWidth={2} dot={false}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
