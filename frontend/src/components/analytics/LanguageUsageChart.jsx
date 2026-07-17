import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Python", value: 45 },
  { name: "JavaScript", value: 30 },
  { name: "Java", value: 15 },
  { name: "C++", value: 10 },
];

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

const LanguageUsageChart = () => {

  return (

    <div className="bg-white p-5 rounded-xl shadow-md">

      <h2 className="text-xl font-bold mb-4">
        Language Usage
      </h2>

      <ResponsiveContainer
        width="100%"
        height={300}
      >

        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            outerRadius={100}
            label
          >

            {data.map((entry, index) => (

              <Cell
                key={index}
                fill={COLORS[index]}
              />

            ))}

          </Pie>

          <Tooltip />

        </PieChart>

      </ResponsiveContainer>

    </div>
  );
};

export default LanguageUsageChart;