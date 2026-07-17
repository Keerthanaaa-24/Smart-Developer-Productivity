import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const data = [
  { day: "Mon", tasks: 2 },
  { day: "Tue", tasks: 4 },
  { day: "Wed", tasks: 3 },
  { day: "Thu", tasks: 5 },
  { day: "Fri", tasks: 6 },
  { day: "Sat", tasks: 2 },
  { day: "Sun", tasks: 1 },
];

const ProductivityChart = () => {

  return (

    <div className="bg-white p-5 rounded-xl shadow-md">

      <h2 className="text-2xl font-bold mb-5">
        Weekly Productivity
      </h2>

      <ResponsiveContainer
        width="100%"
        height={300}
      >

        <BarChart data={data}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="day" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="tasks"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
          />

        </BarChart>

      </ResponsiveContainer>

    </div>
  );
};

export default ProductivityChart;