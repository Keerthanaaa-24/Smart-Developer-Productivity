import { useEffect, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import API from "../../api/axios";


const ProductivityChart = () => {

  const [data, setData] = useState([]);

  const [loading, setLoading] = useState(true);


  useEffect(() => {

    const fetchWeeklyProductivity = async () => {

      try {

        const response = await API.get(
          "/dashboard/weekly-productivity"
        );

        setData(
          response.data?.weekly_productivity || []
        );

      } catch (error) {

        console.error(
          "Failed to fetch weekly productivity:",
          error
        );

      } finally {

        setLoading(false);

      }

    };


    fetchWeeklyProductivity();

  }, []);


  return (

    <div className="bg-white p-5 rounded-xl shadow-md">

      <div className="flex items-center justify-between mb-5">

        <div>

          <h2 className="text-2xl font-bold">
            Weekly Productivity
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Your activity during the last 7 days
          </p>

        </div>

      </div>


      {loading ? (

        <div className="h-[300px] flex items-center justify-center text-gray-500">

          Loading productivity...

        </div>

      ) : (

        <ResponsiveContainer
          width="100%"
          height={300}
        >

          <BarChart data={data}>

            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="day"
            />

            <YAxis
              allowDecimals={false}
            />

            <Tooltip />

            <Bar
              dataKey="activities"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
            />

          </BarChart>

        </ResponsiveContainer>

      )}

    </div>

  );

};


export default ProductivityChart;