import { BudgetChart } from "./components/BudgetChart";
import { getDataForChart } from "./utils";

export default async function Viz() {
  const data = await getDataForChart();

  return (
    <main>
      <div>
        <p>
          <strong>What is happening in this example?</strong>
        </p>
        <ul>
          <li>We are getting data from a publicly accessible API.</li>
          <li>
            When the data is loaded, we transform it into a shape our chart
            expects.
          </li>
          <li>
            We pass the transformed data into the chart so it can render to the
            UI.
          </li>
          <li>
            We created a reusable custom chart component instead of inlining all
            our chart code here
          </li>
          <li>
            The charting library we are using has lots of chart types, see
            https://recharts.org/en-US
          </li>
        </ul>
      </div>
      <h2>Israel&apos;s 2023 Budget - Income</h2>
      <br />
      <div>
        <BudgetChart data={data} xKey="name" yKey="amount" />
      </div>
    </main>
  );
}
