import { BarChart } from "@mui/x-charts/BarChart";
import { currencyFormat } from "@/lib/utils";

type FinancialBarDatum = {
  label: string;
  value: number;
  unit: "currency" | "count";
};

type FinancialBarChartProps = {
  data: FinancialBarDatum[];
};

const formatBarValue = (value: number, unit: FinancialBarDatum["unit"]) => {
  if (unit === "currency") {
    return currencyFormat(value, "currency");
  }

  return `${Math.round(value)} registro${Math.round(value) === 1 ? "" : "s"}`;
};

export default function FinancialBarChart({ data }: FinancialBarChartProps) {
  const hasData = data.some((item) => item.value > 0);

  if (!hasData) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
        Sem indicadores para exibir no grafico.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        Indicadores financeiros
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Gastos, ganhos, pagamentos e atividade de orcamentos no mes.
      </p>

      <BarChart
        borderRadius={10}
        xAxis={[
          {
            scaleType: "band",
            data: data.map((item) => item.label),
          },
        ]}
        series={[
          {
            data: data.map((item) => Number(item.value.toFixed(2))),
            color: "var(--theme-highlight)",
            valueFormatter: (value, context) => {
              if (value === null) return "-";
              const dataItem = data[context.dataIndex];
              return formatBarValue(Number(value), dataItem.unit);
            },
          },
        ]}
        yAxis={[
          {
            valueFormatter: (value: number) => {
              if (typeof value !== "number") return "";
              if (value >= 1000) return `${Math.round(value / 1000)}k`;
              return `${Math.round(value)}`;
            },
          },
        ]}
        slotProps={{ tooltip: { trigger: "item" } }}
        margin={{ top: 20, right: 10, left: 40, bottom: 40 }}
        height={250}
      />
    </div>
  );
}
